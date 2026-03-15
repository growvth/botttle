import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';
import { error, success } from './lib/response.js';
import { HttpStatus, ErrorCode } from './lib/errors.js';
import { authRoutes } from './modules/auth/routes.js';
import { clientRoutes } from './modules/clients/routes.js';
import { userRoutes } from './modules/users/routes.js';

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

  return app;
}
