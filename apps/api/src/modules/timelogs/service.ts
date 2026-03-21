import { timeLogRepository } from './repository.js';
import type { CreateTimeLogBody, StopTimeLogBody } from './schema.js';

function parseDate(v: string | Date | undefined | null): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffSeconds(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return ms > 0 ? Math.round(ms / 1000) : 0;
}

export const timeLogService = {
  async listByProjectId(projectId: string) {
    return timeLogRepository.findManyByProjectId(projectId);
  },

  async create(projectId: string, body: CreateTimeLogBody) {
    const now = new Date();
    const startedAt = parseDate((body.startedAt ?? now) as string | Date) ?? now;
    const endedAt = body.endedAt ? parseDate(body.endedAt as string | Date) : null;
    const durationSeconds = endedAt ? diffSeconds(startedAt, endedAt) : 0;
    return timeLogRepository.create({
      projectId,
      description: body.description ?? null,
      startedAt,
      endedAt,
      durationSeconds,
      billable: body.billable ?? true,
    });
  },

  async stop(id: string, body: StopTimeLogBody) {
    const existing = await timeLogRepository.findById(id);
    if (!existing) return null;
    const end = parseDate((body.endedAt ?? new Date()) as string | Date) ?? new Date();
    const startedAt = existing.startedAt;
    const durationSeconds = diffSeconds(startedAt, end);
    return timeLogRepository.update(id, {
      endedAt: end,
      durationSeconds,
    });
  },

  async delete(id: string) {
    const existing = await timeLogRepository.findById(id);
    if (!existing) return null;
    await timeLogRepository.delete(id);
    return { deleted: true };
  },
};

