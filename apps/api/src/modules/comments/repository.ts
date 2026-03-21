import { prisma } from '@botttle/db';

export const commentRepository = {
  findManyByProjectId(projectId: string) {
    return prisma.comment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  },

  create(data: { projectId: string; userId: string; body: string }) {
    return prisma.comment.create({
      data,
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.comment.findUnique({
      where: { id },
      select: { id: true, userId: true, projectId: true },
    });
  },

  delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  },
};
