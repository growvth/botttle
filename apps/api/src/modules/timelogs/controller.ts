import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { timeLogService } from './service.js';
import { createTimeLogSchema, stopTimeLogSchema } from './schema.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { canAccessProject } from '../../lib/project-access.js';
import { projectIdFromRequest } from '../../lib/route-params.js';
import { recordAudit } from '../../lib/audit-log.js';

export async function listTimeLogs(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const list = await timeLogService.listByProjectId(projectId);
  return reply.send(success(list));
}

export async function createTimeLog(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const body = createTimeLogSchema.parse(request.body);
  const created = await timeLogService.create(projectId, body);
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'TIME_LOG_CREATED',
    entityType: 'time_log',
    entityId: created.id,
    metadata: { projectId, billable: created.billable },
  });
  return reply.status(201).send(success(created));
}

export async function stopTimeLog(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const log = await prisma.timeLog.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!log) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Time log not found'));
  }
  const allowed = await canAccessProject(user, log.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this time log'));
  }
  const body = stopTimeLogSchema.parse(request.body ?? {});
  const updated = await timeLogService.stop(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Time log not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'TIME_LOG_STOPPED',
    entityType: 'time_log',
    entityId: id,
    metadata: { projectId: log.projectId, durationSeconds: updated.durationSeconds },
  });
  return reply.send(success(updated));
}

export async function deleteTimeLog(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const log = await prisma.timeLog.findUnique({
    where: { id },
    select: { projectId: true },
  });
  if (!log) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Time log not found'));
  }
  const allowed = await canAccessProject(user, log.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this time log'));
  }
  const result = await timeLogService.delete(id);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Time log not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'TIME_LOG_DELETED',
    entityType: 'time_log',
    entityId: id,
    metadata: { projectId: log.projectId },
  });
  return reply.send(success(result));
}

