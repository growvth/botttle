import { prisma, type MilestoneStatus } from '@botttle/db';

export const taskRepository = {
  findById(id: string) {
    return prisma.task.findUnique({
      where: { id },
      include: { milestone: { include: { project: true } } },
    });
  },

  findManyByMilestoneId(milestoneId: string) {
    return prisma.task.findMany({
      where: { milestoneId },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  },

  create(data: {
    milestoneId: string;
    title: string;
    description?: string | null;
    status: MilestoneStatus;
    dueDate?: Date | null;
  }) {
    return prisma.task.create({
      data,
      include: { milestone: true },
    });
  },

  update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      status?: MilestoneStatus;
      dueDate?: Date | null;
    }
  ) {
    return prisma.task.update({
      where: { id },
      data,
      include: { milestone: true },
    });
  },

  delete(id: string) {
    return prisma.task.delete({ where: { id } });
  },
};
