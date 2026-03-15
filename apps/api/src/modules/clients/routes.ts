import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { listClients, getClient, createClient, updateClient, deleteClient } from './controller.js';
import { requireAuth, requireRole } from '../auth/hooks.js';

export async function clientRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, listClients);
  app.get('/:id', { preHandler: [requireAuth] }, getClient);
  app.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, createClient);
  app.patch('/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, updateClient);
  app.delete('/:id', { preHandler: [requireAuth, requireRole('ADMIN')] }, deleteClient);
}
