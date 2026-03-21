import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { milestoneService } from './service.js';
import { createMilestoneSchema, updateMilestoneSchema } from './schema.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { projectIdFromRequest } from '../../lib/route-params.js';
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

export async function listMilestones(
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
  const list = await milestoneService.listByProjectId(projectId);
  return reply.send(success(list));
}

export async function getMilestone(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await milestoneService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  const allowed = await canAccessProject(user, found.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this milestone'));
  }
  return reply.send(success(found));
}

export async function createMilestone(
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
  const body = createMilestoneSchema.parse(request.body);
  const created = await milestoneService.create(projectId, body);
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'MILESTONE_CREATED',
    entityType: 'milestone',
    entityId: created.id,
    metadata: { projectId, title: created.title },
  });
  return reply.status(201).send(success(created));
}

export async function updateMilestone(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await milestoneService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  const allowed = await canAccessProject(user, found.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this milestone'));
  }
  const body = updateMilestoneSchema.parse(request.body);
  const updated = await milestoneService.update(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'MILESTONE_UPDATED',
    entityType: 'milestone',
    entityId: id,
    metadata: { projectId: found.projectId, ...body } as Record<string, unknown>,
  });
  return reply.send(success(updated));
}

export async function deleteMilestone(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const found = await milestoneService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  const allowed = await canAccessProject(user, found.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this milestone'));
  }
  const result = await milestoneService.delete(id);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Milestone not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'MILESTONE_DELETED',
    entityType: 'milestone',
    entityId: id,
    metadata: { projectId: found.projectId },
  });
  return reply.send(success(result));
}
