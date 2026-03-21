import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@botttle/db';
import { projectService } from './service.js';
import { createProjectSchema, updateProjectSchema } from './schema.js';
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

export async function listProjects(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const dbUser = await prisma.user.findUnique({
    where: { id: user.sub },
    select: { clientId: true },
  });
  const list = await projectService.list(dbUser?.clientId ?? null, user.role === 'ADMIN');
  return reply.send(success(list));
}

export async function getProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = projectIdFromRequest(request);
  if (!id) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const found = await projectService.getById(id);
  if (!found) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Project not found'));
  }
  return reply.send(success(found));
}

export async function createProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const body = createProjectSchema.parse(request.body);
  const created = await projectService.create(body);
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'PROJECT_CREATED',
    entityType: 'project',
    entityId: created.id,
    metadata: { title: created.title, clientId: created.clientId },
  });
  return reply.status(201).send(success(created));
}

export async function updateProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = projectIdFromRequest(request);
  if (!id) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const body = updateProjectSchema.parse(request.body);
  const updated = await projectService.update(id, body);
  if (!updated) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Project not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'PROJECT_UPDATED',
    entityType: 'project',
    entityId: id,
    metadata: body as Record<string, unknown>,
  });
  return reply.send(success(updated));
}

export async function deleteProject(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = projectIdFromRequest(request);
  if (!id) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, id);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const result = await projectService.delete(id);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Project not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'PROJECT_DELETED',
    entityType: 'project',
    entityId: id,
  });
  return reply.send(success(result));
}
