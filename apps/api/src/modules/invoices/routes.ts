import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listInvoices,
  listInvoicesByProject,
  getInvoice,
  createInvoice,
  updateInvoiceStatus,
  addPayment,
  getPdf,
} from './controller.js';
import { requireAuth, requireRole } from '../auth/hooks.js';

export async function invoiceRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, listInvoices);
  app.get('/pdf-placeholder', { preHandler: [requireAuth] }, getPdf);
  app.get('/:id', { preHandler: [requireAuth] }, getInvoice);
  app.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, createInvoice);
  app.patch('/:id/status', { preHandler: [requireAuth] }, updateInvoiceStatus);
  app.post('/:id/payments', { preHandler: [requireAuth] }, addPayment);
}

/** Nested under /api/projects/:projectId -> GET :projectId/invoices */
export async function invoiceNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/invoices', { preHandler: [requireAuth] }, listInvoicesByProject);
}
