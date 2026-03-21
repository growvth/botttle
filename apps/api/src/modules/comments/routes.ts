import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { listComments, createComment, deleteComment } from './controller.js';
import { requireAuth } from '../auth/hooks.js';

export async function commentNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/comments', { preHandler: [requireAuth] }, listComments);
  app.post('/:projectId/comments', { preHandler: [requireAuth] }, createComment);
}

export async function commentRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.delete('/:id', { preHandler: [requireAuth] }, deleteComment);
}
