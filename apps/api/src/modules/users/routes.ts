import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getMe, listUsers, getUser, updateUser } from './controller.js';
import { requireAuth, requireRole } from '../auth/hooks.js';

export async function userRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  app.get('/me', { preHandler: [requireAuth] }, getMe);
  app.get('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, listUsers);
  app.get('/:id', { preHandler: [requireAuth] }, getUser);
  app.patch('/:id', { preHandler: [requireAuth] }, updateUser);
}
