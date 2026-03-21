import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { error, success } from './lib/response.js';
import { HttpStatus, ErrorCode } from './lib/errors.js';
import { authRoutes } from './modules/auth/routes.js';
import { clientRoutes } from './modules/clients/routes.js';
import { invoiceNestedRoutes, invoiceRoutes } from './modules/invoices/routes.js';
import { milestoneNestedRoutes, milestoneRoutes } from './modules/milestones/routes.js';
import { projectRoutes } from './modules/projects/routes.js';
import { taskNestedRoutes, taskRoutes } from './modules/tasks/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { timeLogNestedRoutes, timeLogRoutes } from './modules/timelogs/routes.js';
import { commentNestedRoutes, commentRoutes } from './modules/comments/routes.js';
import { projectFileNestedRoutes, projectFileRoutes } from './modules/project-files/routes.js';
import { reportsRoutes } from './modules/reports/routes.js';
import { lemonSqueezyWebhookRoutes } from './modules/webhooks/lemon-squeezy/routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.setErrorHandler((err: unknown, _request, reply) => {
    if (err instanceof ZodError) {
      const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send(error(ErrorCode.VALIDATION_ERROR, message));
    }
    const e = err as { statusCode?: number; code?: string; message?: string };
    app.log.error(err);
    const statusCode = e.statusCode ?? 500;
    const code = e.code ?? ErrorCode.INTERNAL_ERROR;
    const message = e.message ?? 'Internal server error';
    return reply.status(statusCode).send(error(String(code), message));
  });

  app.get('/health', async (_request, reply) => {
    return reply.send(success({ status: 'ok' }));
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(clientRoutes, { prefix: '/api/clients' });
  await app.register(projectRoutes, { prefix: '/api/projects' });
  await app.register(milestoneNestedRoutes, { prefix: '/api/projects' });
  await app.register(invoiceNestedRoutes, { prefix: '/api/projects' });
  await app.register(timeLogNestedRoutes, { prefix: '/api/projects' });
  await app.register(commentNestedRoutes, { prefix: '/api/projects' });
  await app.register(projectFileNestedRoutes, { prefix: '/api/projects' });
  await app.register(milestoneRoutes, { prefix: '/api/milestones' });
  await app.register(taskNestedRoutes, { prefix: '/api/projects' });
  await app.register(taskRoutes, { prefix: '/api/tasks' });
  await app.register(invoiceRoutes, { prefix: '/api/invoices' });
  await app.register(timeLogRoutes, { prefix: '/api/time-logs' });
  await app.register(commentRoutes, { prefix: '/api/comments' });
  await app.register(projectFileRoutes, { prefix: '/api/project-files' });
  await app.register(reportsRoutes, { prefix: '/api/reports' });
  await app.register(lemonSqueezyWebhookRoutes, { prefix: '/api/webhooks/lemon-squeezy' });

  return app;
}
