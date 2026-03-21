import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { invoiceService } from './service.js';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  createPaymentSchema,
  updateInvoicePaymentSettingsSchema,
} from './schema.js';
import { resolveClientPaymentLink } from './payment-link.js';
import { notifyInvoiceSentEmails } from '../../lib/email-notify.js';
import { generateInvoicePdf } from './pdf.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus, ErrorCode } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { projectIdFromRequest } from '../../lib/route-params.js';
import { recordAudit } from '../../lib/audit-log.js';

async function canAccessProject(user: { role: string; sub: string }, projectId: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true },
  });
  if (!project) return false;
  const u = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { clientId: true },
  });
  return u?.clientId === project.clientId;
}

async function canAccessInvoice(user: { role: string; sub: string }, invoiceId: string): Promise<boolean> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { projectId: true },
  });
  return invoice ? canAccessProject(user, invoice.projectId) : false;
}

function paymentTotals(payments: { amount: number; status: string }[], invoiceTotal: number) {
  const totalPaid = payments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.round((invoiceTotal - totalPaid) * 100) / 100;
  return { totalPaid, balanceDue };
}

export async function listInvoices(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { clientId: true },
  });
  const list = await invoiceService.list(dbUser?.clientId ?? null, user.role === 'ADMIN');
  return reply.send(success(list));
}

export async function listInvoicesByProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const clientPortal = user.role !== 'ADMIN';
  const list = await invoiceService.listByProjectId(projectId, clientPortal);
  return reply.send(success(list));
}

export async function getInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const found = await invoiceService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Invoice not found'));
  }
  if (user.role === 'CLIENT' && found.status === 'DRAFT') {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Invoice not available'));
  }
  const { totalPaid, balanceDue } = paymentTotals(found.payments, found.total);
  let paymentLink: string | null = null;
  let payload = found;
  if (user.role === 'CLIENT' && balanceDue > 0 && ['SENT', 'PARTIAL', 'OVERDUE'].includes(found.status)) {
    const resolved = await resolveClientPaymentLink(found, balanceDue);
    paymentLink = resolved.paymentLink;
    payload = resolved.invoice;
  }
  return reply.send(success({ ...payload, totalPaid, balanceDue, paymentLink }));
}

export async function createInvoice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const body = createInvoiceSchema.parse(request.body);
  const allowed = await canAccessProject(user, body.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const created = await invoiceService.create(body);
  if (!created) {
    return reply
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(error(ErrorCode.INTERNAL_ERROR, 'Invoice create failed'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'INVOICE_CREATED',
    entityType: 'invoice',
    entityId: created.id,
    metadata: { number: created.number, projectId: created.projectId, total: created.total },
  });
  return reply.status(201).send(success(created));
}

export async function updateInvoiceStatus(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  if (user.role !== 'ADMIN') {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Admins only'));
  }
  const id = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const body = updateInvoiceSchema.parse(request.body);
  if (!body.status) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'status is required'));
  }
  const previous = await invoiceService.getById(id);
  const updated = await invoiceService.updateStatus(id, body.status);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Invoice not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'INVOICE_STATUS_UPDATED',
    entityType: 'invoice',
    entityId: id,
    metadata: { from: previous?.status ?? null, to: body.status },
  });
  if (body.status === 'SENT' && previous?.status !== 'SENT' && updated.project?.clientId) {
    void notifyInvoiceSentEmails({
      clientId: updated.project.clientId,
      invoiceNumber: updated.number,
      total: updated.total,
      currency: updated.currency,
      invoiceId: updated.id,
    });
  }
  return reply.send(success(updated));
}

export async function addPayment(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  if (user.role !== 'ADMIN') {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Admins only'));
  }
  const invoiceId = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, invoiceId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const body = createPaymentSchema.parse(request.body);
  const result = await invoiceService.addPayment(invoiceId, body);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Invoice not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'INVOICE_PAYMENT_RECORDED',
    entityType: 'invoice',
    entityId: invoiceId,
    metadata: { amount: body.amount, status: body.status ?? 'PENDING' },
  });
  return reply.status(201).send(success(result));
}

export async function getInvoicePdf(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const invoice = await invoiceService.getById(id);
  if (!invoice) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Invoice not found'));
  }
  if (user.role === 'CLIENT' && invoice.status === 'DRAFT') {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Invoice not available'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'INVOICE_PDF_VIEWED',
    entityType: 'invoice',
    entityId: id,
  });
  const buffer = await generateInvoicePdf(invoice);
  const filename = `invoice-${invoice.number.replace(/\s+/g, '-')}.pdf`;
  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer);
}

export async function patchInvoicePaymentSettings(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  if (user.role !== 'ADMIN') {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Admins only'));
  }
  const id = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const raw = updateInvoicePaymentSettingsSchema.parse(request.body);
  const body = {
    ...(raw.paymentUrl !== undefined
      ? { paymentUrl: raw.paymentUrl === '' ? null : raw.paymentUrl }
      : {}),
    ...(raw.lemonVariantId !== undefined
      ? { lemonVariantId: raw.lemonVariantId === '' ? null : raw.lemonVariantId }
      : {}),
  };
  const updated = await invoiceService.updatePaymentSettings(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Invoice not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'INVOICE_PAYMENT_SETTINGS_UPDATED',
    entityType: 'invoice',
    entityId: id,
    metadata: body as Record<string, unknown>,
  });
  return reply.send(success(updated));
}

export async function postInvoiceLemonCheckout(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  if (user.role !== 'ADMIN') {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Admins only'));
  }
  const id = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const updated = await invoiceService.generateLemonCheckoutAndSave(id);
  if (!updated) {
    return reply
      .status(HttpStatus.UNPROCESSABLE_ENTITY)
      .send(
        error(
          'VALIDATION_ERROR',
          'Could not create Lemon checkout (check LEMONSQUEEZY_API_KEY and variant id on invoice or LEMONSQUEEZY_DEFAULT_VARIANT_ID)'
        )
      );
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'INVOICE_LEMON_CHECKOUT_CREATED',
    entityType: 'invoice',
    entityId: id,
    metadata: { paymentUrl: updated.paymentUrl },
  });
  return reply.send(success(updated));
}
