import { prisma } from '@botttle/db';

export const timeLogRepository = {
  findById(id: string) {
    return prisma.timeLog.findUnique({
      where: { id },
      include: { project: { include: { client: true } } },
    });
  },

  findManyByProjectId(projectId: string) {
    return prisma.timeLog.findMany({
      where: { projectId },
      orderBy: [{ startedAt: 'desc' }],
    });
  },

  create(data: {
    projectId: string;
    description?: string | null;
    startedAt: Date;
    endedAt?: Date | null;
    durationSeconds: number;
    billable?: boolean;
  }) {
    return prisma.timeLog.create({
      data,
    });
  },

  update(
    id: string,
    data: {
      description?: string | null;
      startedAt?: Date;
      endedAt?: Date | null;
      durationSeconds?: number;
    }
  ) {
    return prisma.timeLog.update({
      where: { id },
      data,
    });
  },

  delete(id: string) {
    return prisma.timeLog.delete({ where: { id } });
  },
};

