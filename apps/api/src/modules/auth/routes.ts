import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { login, register, refresh } from './controller.js';

export async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  app.post('/login', login);
  app.post('/register', register);
  app.post('/refresh', refresh);
}
