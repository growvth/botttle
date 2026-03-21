import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getReportsSummary, getTimeReport } from './controller.js';
import { requireAuth } from '../auth/hooks.js';

export async function reportsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/summary', { preHandler: [requireAuth] }, getReportsSummary);
  app.get('/time', { preHandler: [requireAuth] }, getTimeReport);
}
