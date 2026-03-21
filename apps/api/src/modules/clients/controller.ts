import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { clientService } from './service.js';
import { createClientSchema, updateClientSchema } from './schema.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { recordAudit } from '../../lib/audit-log.js';

export async function listClients(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  if (user.role === 'ADMIN') {
    const list = await clientService.list();
    return reply.send(success(list));
  }
  const dbUser = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { clientId: true },
  });
  if (!dbUser?.clientId) {
    return reply.send(success([]));
  }
  const client = await clientService.getById(dbUser.clientId);
  return reply.send(success(client ? [client] : []));
}

export async function getClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await clientService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Client not found'));
  }
  if (user.role !== 'ADMIN') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.sub },
      select: { clientId: true },
    });
    if (dbUser?.clientId !== found.id) {
      return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this client'));
    }
  }
  return reply.send(success(found));
}

export async function createClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const body = createClientSchema.parse(request.body);
  const created = await clientService.create(body);
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'CLIENT_CREATED',
    entityType: 'client',
    entityId: created.id,
    metadata: { name: created.name },
  });
  return reply.status(201).send(success(created));
}

export async function updateClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const body = updateClientSchema.parse(request.body);
  const updated = await clientService.update(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Client not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'CLIENT_UPDATED',
    entityType: 'client',
    entityId: id,
    metadata: body as Record<string, unknown>,
  });
  return reply.send(success(updated));
}

export async function deleteClient(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const result = await clientService.delete(id);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Client not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'CLIENT_DELETED',
    entityType: 'client',
    entityId: id,
  });
  return reply.send(success(result));
}
