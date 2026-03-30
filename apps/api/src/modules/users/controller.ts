import type { FastifyRequest, FastifyReply } from 'fastify';
import { userService } from './service.js';
import { updateUserSchema } from './schema.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { recordAudit } from '../../lib/audit-log.js';

export async function getMe(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const found = await userService.getById(user.sub);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'User not found'));
  }
  return reply.send(success(found));
}

export async function listUsers(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const list = await userService.list();
  return reply.send(success(list));
}

export async function getUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  if (user.role !== 'ADMIN' && id !== user.sub) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Insufficient permissions'));
  }
  const found = await userService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'User not found'));
  }
  return reply.send(success(found));
}

export async function updateUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const raw = updateUserSchema.parse(request.body);
  if (user.role !== 'ADMIN') {
    if (id !== user.sub) {
      return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Insufficient permissions'));
    }
    if (raw.role !== undefined || raw.disabled !== undefined || raw.clientId !== undefined) {
      return reply
        .status(HttpStatus.FORBIDDEN)
        .send(error('FORBIDDEN', 'Only administrators can change role, disabled status, or client'));
    }
  } else if (id === user.sub) {
    if (raw.disabled === true) {
      return reply.status(HttpStatus.BAD_REQUEST).send(error('BAD_REQUEST', 'You cannot disable your own account'));
    }
    if (raw.role === 'CLIENT') {
      return reply
        .status(HttpStatus.BAD_REQUEST)
        .send(error('BAD_REQUEST', 'You cannot remove your own administrator role'));
    }
  }
  const body = user.role === 'ADMIN' ? raw : { name: raw.name };
  const updated = await userService.update(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'User not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'USER_UPDATED',
    entityType: 'user',
    entityId: id,
    metadata: body as Record<string, unknown>,
  });
  return reply.send(success(updated));
}
