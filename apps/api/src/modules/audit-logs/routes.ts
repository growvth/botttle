import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { listAuditLogs } from './controller.js';
import { requireAuth, requireRole } from '../auth/hooks.js';

export async function auditLogRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, listAuditLogs);
}
