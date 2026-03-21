import type { Prisma } from '@botttle/db';
import { auditLogRepository } from './repository.js';
import type { z } from 'zod';
import type { listAuditLogsQuerySchema } from './schema.js';

export const auditLogService = {
  async list(q: z.infer<typeof listAuditLogsQuerySchema>) {
    const where: Prisma.AuditLogWhereInput = {};
    if (q.action) {
      where.action = { contains: q.action, mode: 'insensitive' };
    }
    if (q.entityType) {
      where.entityType = { contains: q.entityType, mode: 'insensitive' };
    }
    const [items, total] = await Promise.all([
      auditLogRepository.findMany({
        take: q.take,
        skip: q.skip,
        where,
      }),
      auditLogRepository.count(where),
    ]);
    return { items, total, take: q.take, skip: q.skip };
  },
};
