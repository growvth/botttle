import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  downloadProjectFile,
} from './controller.js';
import { requireAuth } from '../auth/hooks.js';

export async function projectFileNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/files', { preHandler: [requireAuth] }, listProjectFiles);
  app.post('/:projectId/files', { preHandler: [requireAuth] }, uploadProjectFile);
}

export async function projectFileRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:id/download', { preHandler: [requireAuth] }, downloadProjectFile);
  app.delete('/:id', { preHandler: [requireAuth] }, deleteProjectFile);
}
