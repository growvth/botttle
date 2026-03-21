import type { FastifyRequest, FastifyReply } from 'fastify';
import { commentService } from './service.js';
import { createCommentSchema } from './schema.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { canAccessProject } from '../../lib/project-access.js';
import { projectIdFromRequest } from '../../lib/route-params.js';
import { recordAudit } from '../../lib/audit-log.js';

export async function listComments(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const list = await commentService.listByProject(projectId);
  return reply.send(success(list));
}

export async function createComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const body = createCommentSchema.parse(request.body);
  const created = await commentService.create(projectId, user.sub, body);
  return reply.status(201).send(success(created));
}

export async function deleteComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const result = await commentService.delete(id, user.sub, user.role === 'ADMIN');
  if (result === null) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'Comment not found'));
  }
  if (result === false) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot delete this comment'));
  }
  const del = result as { deleted: true; projectId: string; commentId: string };
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'COMMENT_DELETED',
    entityType: 'comment',
    entityId: del.commentId,
    metadata: { projectId: del.projectId },
  });
  return reply.send(success(result));
}
