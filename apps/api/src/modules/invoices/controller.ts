import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { invoiceService } from './service.js';
import { createInvoiceSchema, updateInvoiceSchema, createPaymentSchema } from './schema.js';
import { generateInvoicePdf } from './pdf.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { projectIdFromRequest } from '../../lib/route-params.js';

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
  const list = await invoiceService.listByProjectId(projectId);
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
  return reply.send(success(found));
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
  return reply.status(201).send(success(created));
}

export async function updateInvoiceStatus(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const allowed = await canAccessInvoice(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this invoice'));
  }
  const body = updateInvoiceSchema.parse(request.body);
  if (!body.status) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'status is required'));
  }
  const updated = await invoiceService.updateStatus(id, body.status);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Invoice not found'));
  }
  return reply.send(success(updated));
}

export async function addPayment(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
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
  const buffer = await generateInvoicePdf(invoice);
  const filename = `invoice-${invoice.number.replace(/\s+/g, '-')}.pdf`;
  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${filename}"`)
    .send(buffer);
}
