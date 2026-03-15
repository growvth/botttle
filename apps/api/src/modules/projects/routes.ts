import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from './controller.js';
import { requireAuth, requireRole } from '../auth/hooks.js';

export async function projectRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, listProjects);
  app.get('/:id', { preHandler: [requireAuth] }, getProject);
  app.post('/', { preHandler: [requireAuth, requireRole('ADMIN')] }, createProject);
  app.patch('/:id', { preHandler: [requireAuth] }, updateProject);
  app.delete('/:id', { preHandler: [requireAuth] }, deleteProject);
}
