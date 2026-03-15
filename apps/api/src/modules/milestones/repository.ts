import { prisma, type MilestoneStatus } from '@botttle/db';

export const milestoneRepository = {
  findById(id: string) {
    return prisma.milestone.findUnique({
      where: { id },
      include: { project: true, tasks: true },
    });
  },

  findManyByProjectId(projectId: string) {
    return prisma.milestone.findMany({
      where: { projectId },
      include: { _count: { select: { tasks: true } } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    });
  },

  create(data: {
    projectId: string;
    title: string;
    dueDate?: Date | null;
    status: MilestoneStatus;
    completionPercentage?: number;
    description?: string | null;
  }) {
    return prisma.milestone.create({
      data,
      include: { project: true },
    });
  },

  update(
    id: string,
    data: {
      title?: string;
      dueDate?: Date | null;
      status?: MilestoneStatus;
      completionPercentage?: number;
      description?: string | null;
    }
  ) {
    return prisma.milestone.update({
      where: { id },
      data,
      include: { project: true },
    });
  },

  delete(id: string) {
    return prisma.milestone.delete({ where: { id } });
  },
};
