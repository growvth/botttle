import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from './controller.js';
import { requireAuth } from '../auth/hooks.js';

export async function notificationRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  app.get('/', { preHandler: [requireAuth] }, listNotifications);
  app.get('/unread-count', { preHandler: [requireAuth] }, getUnreadCount);
  app.patch('/:id/read', { preHandler: [requireAuth] }, markNotificationRead);
  app.post('/read-all', { preHandler: [requireAuth] }, markAllNotificationsRead);
}
