import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { notificationService } from './service.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function listNotifications(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const q = listQuerySchema.parse(request.query);
  const limit = q.limit ?? 40;
  const [items, unreadCount] = await Promise.all([
    notificationService.list(user.sub, limit),
    notificationService.unreadCount(user.sub),
  ]);
  return reply.send(success({ items, unreadCount }));
}

export async function getUnreadCount(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const unreadCount = await notificationService.unreadCount(user.sub);
  return reply.send(success({ unreadCount }));
}

export async function markNotificationRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const result = await notificationService.markRead(user.sub, id);
  if (result.count === 0) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Notification not found'));
  }
  return reply.send(success({ ok: true }));
}

export async function markAllNotificationsRead(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  await notificationService.markAllRead(user.sub);
  return reply.send(success({ ok: true }));
}
