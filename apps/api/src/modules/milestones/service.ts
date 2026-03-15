import { milestoneRepository } from './repository.js';
import type { CreateMilestoneBody, UpdateMilestoneBody } from './schema.js';

function parseDate(v: string | Date | undefined | null): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const milestoneService = {
  async getById(id: string) {
    return milestoneRepository.findById(id);
  },

  async listByProjectId(projectId: string) {
    return milestoneRepository.findManyByProjectId(projectId);
  },

  async create(projectId: string, body: CreateMilestoneBody) {
    return milestoneRepository.create({
      projectId,
      title: body.title,
      dueDate: parseDate(body.dueDate as string | Date | undefined),
      status: (body.status ?? 'PENDING') as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      completionPercentage: body.completionPercentage ?? 0,
      description: body.description ?? null,
    });
  },

  async update(id: string, body: UpdateMilestoneBody) {
    const existing = await milestoneRepository.findById(id);
    if (!existing) return null;
    const data: Parameters<typeof milestoneRepository.update>[1] = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.dueDate !== undefined) data.dueDate = parseDate(body.dueDate as string | Date);
    if (body.status !== undefined) data.status = body.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    if (body.completionPercentage !== undefined) data.completionPercentage = body.completionPercentage;
    if (body.description !== undefined) data.description = body.description;
    return milestoneRepository.update(id, data);
  },

  async delete(id: string) {
    const existing = await milestoneRepository.findById(id);
    if (!existing) return null;
    await milestoneRepository.delete(id);
    return { deleted: true };
  },
};
