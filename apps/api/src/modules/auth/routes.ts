import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { login, register, refresh, changePassword, forgotPassword, resetPassword } from './controller.js';
import { requireAuth } from './hooks.js';

export async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions): Promise<void> {
  app.post('/login', login);
  app.post('/register', register);
  app.post('/refresh', refresh);
  app.post('/change-password', { preHandler: [requireAuth] }, changePassword);
  app.post('/forgot-password', forgotPassword);
  app.post('/reset-password', resetPassword);
}
