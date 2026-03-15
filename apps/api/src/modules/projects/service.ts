import { projectRepository } from './repository.js';
import type { CreateProjectBody, UpdateProjectBody } from './schema.js';

function parseDate(v: string | Date | undefined | null): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const projectService = {
  async getById(id: string) {
    return projectRepository.findById(id);
  },

  async list(clientId: string | null, isAdmin: boolean) {
    if (isAdmin) return projectRepository.findManyForAdmin();
    if (clientId) return projectRepository.findManyByClientId(clientId);
    return [];
  },

  async create(body: CreateProjectBody) {
    return projectRepository.create({
      title: body.title,
      description: body.description ?? null,
      clientId: body.clientId,
      status: (body.status ?? 'DRAFT') as 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED',
      progress: 0,
      budget: body.budget ?? null,
      startDate: parseDate(body.startDate as string | Date | undefined),
      endDate: parseDate(body.endDate as string | Date | undefined),
    });
  },

  async update(id: string, body: UpdateProjectBody) {
    const existing = await projectRepository.findById(id);
    if (!existing) return null;
    const data: Parameters<typeof projectRepository.update>[1] = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.status !== undefined) data.status = body.status as 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED';
    if (body.progress !== undefined) data.progress = body.progress;
    if (body.budget !== undefined) data.budget = body.budget;
    if (body.startDate !== undefined) data.startDate = parseDate(body.startDate as string | Date);
    if (body.endDate !== undefined) data.endDate = parseDate(body.endDate as string | Date);
    return projectRepository.update(id, data);
  },

  async delete(id: string) {
    const existing = await projectRepository.findById(id);
    if (!existing) return null;
    await projectRepository.delete(id);
    return { deleted: true };
  },
};
