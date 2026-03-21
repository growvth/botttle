import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listTimeLogs,
  createTimeLog,
  stopTimeLog,
  deleteTimeLog,
} from './controller.js';
import { requireAuth } from '../auth/hooks.js';

/** Nested under /api/projects/:projectId -> GET/POST :projectId/time-logs */
export async function timeLogNestedRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/:projectId/time-logs', { preHandler: [requireAuth] }, listTimeLogs);
  app.post('/:projectId/time-logs', { preHandler: [requireAuth] }, createTimeLog);
}

/** Standalone /api/time-logs/:id for stop/delete */
export async function timeLogRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.post('/:id/stop', { preHandler: [requireAuth] }, stopTimeLog);
  app.delete('/:id', { preHandler: [requireAuth] }, deleteTimeLog);
}

