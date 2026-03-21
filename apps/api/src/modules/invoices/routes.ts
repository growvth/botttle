import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listInvoices,
  listInvoicesByProject,
  getInvoice,
  getInvoicePdf,
  createInvoice,
  updateInvoiceStatus,
  addPayment,
  patchInvoicePaymentSettings,
  postInvoiceLemonCheckout,
} from './controller.js';
import { requireAuth, requireRole } from '../auth/hooks.js';

export async function invoiceRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, listInvoices);
  app.get('/:id/pdf', { preHandler: [requireAuth] }, getInvoicePdf);
  app.patch('/:id/payment-settings', { preHandler: [requireAuth, requireRole('ADMIN')] }, patchInvoicePaymentSettings);
  app.post('/:id/checkout/lemon', { preHandler: [requireAuth, requireRole('ADMIN')] }, postInvoiceLemonCheckout);
  app.get('/:id', { preHandler: [requireAuth] }, getInvoice);
  app.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, createInvoice);
  app.patch('/:id/status', { preHandler: [requireAuth, requireRole('ADMIN')] }, updateInvoiceStatus);
  app.post('/:id/payments', { preHandler: [requireAuth, requireRole('ADMIN')] }, addPayment);
}

/** Nested under /api/projects/:projectId -> GET :projectId/invoices */
export async function invoiceNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/invoices', { preHandler: [requireAuth] }, listInvoicesByProject);
}
