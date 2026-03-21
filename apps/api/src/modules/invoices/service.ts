import { invoiceRepository } from './repository.js';
import type { CreateInvoiceBody, CreatePaymentBody } from './schema.js';
import { createLemonCheckoutUrl } from '../../lib/lemon-checkout.js';

function parseDate(v: string | Date | undefined): Date {
  if (v instanceof Date) return v;
  const d = new Date(v as string);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid date');
  return d;
}

export const invoiceService = {
  async getById(id: string) {
    return invoiceRepository.findById(id);
  },

  async list(clientId: string | null, isAdmin: boolean) {
    if (isAdmin) return invoiceRepository.findManyForAdmin();
    if (clientId) return invoiceRepository.findManyByClientId(clientId);
    return [];
  },

  async listByProjectId(projectId: string, clientPortal?: boolean) {
    return invoiceRepository.findByProjectId(projectId, { excludeDrafts: !!clientPortal });
  },

  async create(body: CreateInvoiceBody) {
    const dueDate = parseDate(body.dueDate as string | Date);
    const items = body.items.map((item) => ({
      ...item,
      amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));
    const subtotal = items.reduce((sum, i) => sum + i.amount, 0);
    const taxAmount = (subtotal * (body.taxRate ?? 0)) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;
    return invoiceRepository.create({
      projectId: body.projectId,
      dueDate,
      currency: body.currency ?? 'USD',
      taxRate: body.taxRate ?? 0,
      subtotal,
      total,
      items,
    });
  },

  async updateStatus(id: string, status: string) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) return null;
    return invoiceRepository.updateStatus(id, status as 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'OVERDUE');
  },

  async addPaymentFromProvider(
    invoiceId: string,
    body: { amount: number; externalId: string; paidAt?: Date }
  ) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) return null;
    const paidAt = body.paidAt ?? new Date();
    await invoiceRepository.addPayment({
      invoiceId,
      amount: body.amount,
      status: 'COMPLETED',
      paidAt,
      externalId: body.externalId,
    });
    const refreshed = await invoiceRepository.findById(invoiceId);
    if (!refreshed) return null;
    const totalPaid = refreshed.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    let newStatus = refreshed.status;
    if (totalPaid >= refreshed.total) newStatus = 'PAID';
    else if (totalPaid > 0) newStatus = 'PARTIAL';
    await invoiceRepository.updateStatus(invoiceId, newStatus);
    return invoiceRepository.findById(invoiceId);
  },

  async addPayment(invoiceId: string, body: CreatePaymentBody) {
    const invoice = await invoiceRepository.findById(invoiceId);
    if (!invoice) return null;
    const paidAt = body.paidAt != null ? parseDate(body.paidAt as string | Date) : null;
    await invoiceRepository.addPayment({
      invoiceId,
      amount: body.amount,
      status: body.status ?? 'PENDING',
      paidAt: body.status === 'COMPLETED' ? paidAt ?? new Date() : null,
      externalId: null,
    });
    const totalPaid = invoice.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);
    const newTotalPaid = totalPaid + (body.status === 'COMPLETED' ? body.amount : 0);
    let newStatus = invoice.status;
    if (newTotalPaid >= invoice.total) newStatus = 'PAID';
    else if (newTotalPaid > 0) newStatus = 'PARTIAL';
    await invoiceRepository.updateStatus(invoiceId, newStatus);
    return invoiceRepository.findById(invoiceId);
  },

  async updatePaymentSettings(
    id: string,
    body: { paymentUrl?: string | null; lemonVariantId?: string | null }
  ) {
    const existing = await invoiceRepository.findById(id);
    if (!existing) return null;
    return invoiceRepository.updatePaymentFields(id, body);
  },

  async generateLemonCheckoutAndSave(id: string) {
    const inv = await invoiceRepository.findById(id);
    if (!inv) return null;
    const variantId =
      inv.lemonVariantId?.trim() || process.env['LEMONSQUEEZY_DEFAULT_VARIANT_ID']?.trim();
    if (!variantId) return null;
    const clientEmail = inv.project?.client?.email ?? null;
    const url = await createLemonCheckoutUrl({
      variantId,
      invoiceId: inv.id,
      customerEmail: clientEmail,
    });
    if (!url) return null;
    return invoiceRepository.updatePaymentFields(id, { paymentUrl: url });
  },

};
