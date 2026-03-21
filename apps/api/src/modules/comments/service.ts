import { commentRepository } from './repository.js';
import type { CreateCommentBody } from './schema.js';
import { notificationService } from '../notifications/service.js';

export const commentService = {
  listByProject(projectId: string) {
    return commentRepository.findManyByProjectId(projectId);
  },

  async create(projectId: string, userId: string, body: CreateCommentBody) {
    const created = await commentRepository.create({
      projectId,
      userId,
      body: body.body,
    });
    try {
      await notificationService.onCommentCreated(projectId, userId, body.body);
    } catch {
      /* best-effort: comment must still succeed */
    }
    return created;
  },

  async delete(id: string, requesterId: string, isAdmin: boolean) {
    const existing = await commentRepository.findById(id);
    if (!existing) return null;
    if (!isAdmin && existing.userId !== requesterId) return false;
    const projectId = existing.projectId;
    await commentRepository.delete(id);
    return { deleted: true, projectId, commentId: id };
  },
};
