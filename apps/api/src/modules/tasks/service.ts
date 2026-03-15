import { taskRepository } from './repository.js';
import type { CreateTaskBody, UpdateTaskBody } from './schema.js';

function parseDate(v: string | Date | undefined | null): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const taskService = {
  async getById(id: string) {
    return taskRepository.findById(id);
  },

  async listByMilestoneId(milestoneId: string) {
    return taskRepository.findManyByMilestoneId(milestoneId);
  },

  async create(milestoneId: string, body: CreateTaskBody) {
    return taskRepository.create({
      milestoneId,
      title: body.title,
      description: body.description ?? null,
      status: (body.status ?? 'PENDING') as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED',
      dueDate: parseDate(body.dueDate as string | Date | undefined),
    });
  },

  async update(id: string, body: UpdateTaskBody) {
    const existing = await taskRepository.findById(id);
    if (!existing) return null;
    const data: Parameters<typeof taskRepository.update>[1] = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    if (body.dueDate !== undefined) data.dueDate = parseDate(body.dueDate as string | Date);
    return taskRepository.update(id, data);
  },

  async delete(id: string) {
    const existing = await taskRepository.findById(id);
    if (!existing) return null;
    await taskRepository.delete(id);
    return { deleted: true };
  },
};
