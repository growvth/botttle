import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { taskService } from './service.js';
import { createTaskSchema, updateTaskSchema } from './schema.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { recordAudit } from '../../lib/audit-log.js';

async function canAccessProject(user: { role: string; sub: string }, projectId: string): Promise<boolean> {
  if (user.role === 'ADMIN') return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true },
  });
  if (!project) return false;
  const u = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { clientId: true },
  });
  return u?.clientId === project.clientId;
}

export async function listTasks(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const milestoneId = (request.params as { milestoneId: string }).milestoneId;
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { projectId: true },
  });
  if (!milestone) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  const allowed = await canAccessProject(user, milestone.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this milestone'));
  }
  const list = await taskService.listByMilestoneId(milestoneId);
  return reply.send(success(list));
}

export async function getTask(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await taskService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Task not found'));
  }
  const allowed = await canAccessProject(user, found.milestone.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this task'));
  }
  return reply.send(success(found));
}

export async function createTask(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const milestoneId = (request.params as { milestoneId: string }).milestoneId;
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { projectId: true },
  });
  if (!milestone) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  const allowed = await canAccessProject(user, milestone.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this milestone'));
  }
  const body = createTaskSchema.parse(request.body);
  const created = await taskService.create(milestoneId, body);
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'TASK_CREATED',
    entityType: 'task',
    entityId: created.id,
    metadata: { milestoneId, projectId: milestone.projectId, title: created.title },
  });
  return reply.status(201).send(success(created));
}

export async function updateTask(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await taskService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Task not found'));
  }
  const allowed = await canAccessProject(user, found.milestone.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this task'));
  }
  const body = updateTaskSchema.parse(request.body);
  const updated = await taskService.update(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Task not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'TASK_UPDATED',
    entityType: 'task',
    entityId: id,
    metadata: { projectId: found.milestone.projectId, ...body } as Record<string, unknown>,
  });
  return reply.send(success(updated));
}

export async function deleteTask(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await taskService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Task not found'));
  }
  const allowed = await canAccessProject(user, found.milestone.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this task'));
  }
  const result = await taskService.delete(id);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Task not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'TASK_DELETED',
    entityType: 'task',
    entityId: id,
    metadata: { projectId: found.milestone.projectId },
  });
  return reply.send(success(result));
}
