import type { FastifyRequest, FastifyReply } from 'fastify';
import { projectFileService } from './service.js';
import { projectFileRepository } from './repository.js';
import { success, error } from '../../lib/response.js';
import { HttpStatus } from '../../lib/errors.js';
import type { AuthenticatedRequest } from '../auth/hooks.js';
import { canAccessProject } from '../../lib/project-access.js';
import { projectIdFromRequest } from '../../lib/route-params.js';
import { recordAudit } from '../../lib/audit-log.js';

export async function listProjectFiles(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const list = await projectFileService.listByProject(projectId);
  return reply.send(success(list));
}

export async function uploadProjectFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const projectId = projectIdFromRequest(request);
  if (!projectId) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'Missing project id'));
  }
  const allowed = await canAccessProject(user, projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this project'));
  }
  const file = await request.file();
  if (!file) {
    return reply.status(HttpStatus.BAD_REQUEST).send(error('VALIDATION_ERROR', 'File is required'));
  }
  const buffer = await file.toBuffer();
  try {
    const created = await projectFileService.saveUpload(
      projectId,
      user.sub,
      buffer,
      file.filename,
      file.mimetype
    );
    return reply.status(201).send(success(created));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'UNSUPPORTED_TYPE') {
      return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send(error('VALIDATION_ERROR', 'File type not allowed'));
    }
    if (msg === 'FILE_TOO_LARGE') {
      return reply.status(HttpStatus.UNPROCESSABLE_ENTITY).send(error('VALIDATION_ERROR', 'File too large (max 10MB)'));
    }
    if (msg === 'S3_NOT_CONFIGURED') {
      return reply
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .send(error('INTERNAL_ERROR', 'S3 is not configured (set S3_BUCKET, AWS credentials, FILE_STORAGE=s3)'));
    }
    throw e;
  }
}

export async function deleteProjectFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const row = await projectFileRepository.findById(id);
  if (!row) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'File not found'));
  }
  const allowed = await canAccessProject(user, row.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this file'));
  }
  if (user.role !== 'ADMIN' && row.uploadedById !== user.sub) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Only the uploader or an admin can delete'));
  }
  const result = await projectFileService.delete(id);
  if (!result) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'File not found'));
  }
  recordAudit({
    request,
    actorUserId: user.sub,
    action: 'PROJECT_FILE_DELETED',
    entityType: 'project_file',
    entityId: id,
    metadata: { projectId: row.projectId, filename: row.filename },
  });
  return reply.send(success(result));
}

export async function downloadProjectFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const { user } = request as AuthenticatedRequest;
  const id = (request.params as { id: string }).id;
  const row = await projectFileRepository.findById(id);
  if (!row) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'File not found'));
  }
  const allowed = await canAccessProject(user, row.projectId);
  if (!allowed) {
    return reply.status(HttpStatus.FORBIDDEN).send(error('FORBIDDEN', 'Cannot access this file'));
  }
  if (row.storageProvider === 'LOCAL' && !projectFileService.fileExistsLocally(row.storagePath)) {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'File missing on disk'));
  }
  try {
    const stream = await projectFileService.getReadStreamForRow({
      storagePath: row.storagePath,
      storageProvider: row.storageProvider,
    });
    const mime = row.mimeType ?? 'application/octet-stream';
    return reply
      .header('Content-Type', mime)
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(row.filename)}"`)
      .send(stream);
  } catch {
    return reply.status(HttpStatus.NOT_FOUND).send(error('NOT_FOUND', 'File not available'));
  }
}
