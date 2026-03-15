import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from './controller.js';
import { requireAuth } from '../auth/hooks.js';

/** Nested under /api/projects/:projectId -> GET/POST :projectId/milestones */
export async function milestoneNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/milestones', { preHandler: [requireAuth] }, listMilestones);
  app.post('/:projectId/milestones', { preHandler: [requireAuth] }, createMilestone);
}

/** Standalone /api/milestones/:id */
export async function milestoneRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:id', { preHandler: [requireAuth] }, getMilestone);
  app.patch('/:id', { preHandler: [requireAuth] }, updateMilestone);
  app.delete('/:id', { preHandler: [requireAuth] }, deleteMilestone);
}
