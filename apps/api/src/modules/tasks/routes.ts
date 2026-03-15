import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
} from './controller.js';
import { requireAuth } from '../auth/hooks.js';

/** Nested under /api/projects -> GET/POST :projectId/milestones/:milestoneId/tasks */
export async function taskNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/milestones/:milestoneId/tasks', { preHandler: [requireAuth] }, listTasks);
  app.post('/:projectId/milestones/:milestoneId/tasks', { preHandler: [requireAuth] }, createTask);
}

/** Standalone /api/tasks/:id */
export async function taskRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:id', { preHandler: [requireAuth] }, getTask);
  app.patch('/:id', { preHandler: [requireAuth] }, updateTask);
  app.delete('/:id', { preHandler: [requireAuth] }, deleteTask);
}
