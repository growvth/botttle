import { commentRepository } from './repository.js';
import type { CreateCommentBody } from './schema.js';

export const commentService = {
  listByProject(projectId: string) {
    return commentRepository.findManyByProjectId(projectId);
  },

  create(projectId: string, userId: string, body: CreateCommentBody) {
    return commentRepository.create({
      projectId,
      userId,
      body: body.body,
    });
  },

  async delete(id: string, requesterId: string, isAdmin: boolean) {
    const existing = await commentRepository.findById(id);
    if (!existing) return null;
    if (!isAdmin && existing.userId !== requesterId) return false;
    await commentRepository.delete(id);
    return { deleted: true };
  },
};
