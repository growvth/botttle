import { z } from 'zod';

export const invoiceStatusEnum = z.enum(['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE']);
export const paymentStatusEnum = z.enum(['PENDING', 'COMPLETED', 'FAILED']);

export const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const createInvoiceSchema = z.object({
  projectId: z.string().cuid(),
  dueDate: z.union([z.string().datetime(), z.string().regex(/^\d{4}-\d{2}-\d{2}/), z.date()]),
  currency: z.string().length(3).optional().default('USD'),
  taxRate: z.number().min(0).max(100).optional().default(0),
  items: z.array(invoiceItemSchema).min(1),
});
export type CreateInvoiceBody = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  status: invoiceStatusEnum.optional(),
  dueDate: z.string().datetime().optional().or(z.date()),
  items: z.array(invoiceItemSchema).optional(),
  taxRate: z.number().min(0).max(100).optional(),
});
export type UpdateInvoiceBody = z.infer<typeof updateInvoiceSchema>;

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  status: paymentStatusEnum.optional().default('PENDING'),
  paidAt: z.string().datetime().optional().or(z.date()),
});
export type CreatePaymentBody = z.infer<typeof createPaymentSchema>;
