import { prisma, type Prisma } from '@botttle/db';

export const auditLogRepository = {
  findMany(opts: {
    take: number;
    skip: number;
    where: Prisma.AuditLogWhereInput;
  }) {
    return prisma.auditLog.findMany({
      where: opts.where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: opts.take,
      skip: opts.skip,
      include: {
        actor: { select: { id: true, email: true, name: true } },
      },
    });
  },

  count(where: Prisma.AuditLogWhereInput) {
    return prisma.auditLog.count({ where });
  },
};
