import { prisma } from '@botttle/db';

export const clientRepository = {
  findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  findAll() {
    return prisma.client.findMany({ orderBy: { createdAt: 'desc' } });
  },

  create(data: { name: string; email?: string | null }) {
    return prisma.client.create({ data });
  },

  update(id: string, data: { name?: string; email?: string | null }) {
    return prisma.client.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.client.delete({ where: { id } });
  },
};
