import { prisma, type ProjectStatus } from '@botttle/db';

export const projectRepository = {
  findById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        milestones: {
          orderBy: { dueDate: 'asc' },
          include: { tasks: { orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }] } },
        },
      },
    });
  },

  findManyByClientId(clientId: string) {
    return prisma.project.findMany({
      where: { clientId },
      include: { client: true, _count: { select: { milestones: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  },

  findManyForAdmin() {
    return prisma.project.findMany({
      include: { client: true, _count: { select: { milestones: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  },

  create(data: {
    title: string;
    description?: string | null;
    clientId: string;
    status: ProjectStatus;
    progress?: number;
    budget?: number | null;
    startDate?: Date | null;
    endDate?: Date | null;
  }) {
    return prisma.project.create({
      data,
      include: { client: true },
    });
  },

  update(
    id: string,
    data: {
      title?: string;
      description?: string | null;
      status?: ProjectStatus;
      progress?: number;
      budget?: number | null;
      startDate?: Date | null;
      endDate?: Date | null;
    }
  ) {
    return prisma.project.update({
      where: { id },
      data,
      include: { client: true },
    });
  },

  delete(id: string) {
    return prisma.project.delete({ where: { id } });
  },
};
