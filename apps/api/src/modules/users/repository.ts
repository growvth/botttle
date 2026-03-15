import { prisma, type Role } from '@botttle/db';

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, disabled: true, clientId: true, createdAt: true },
    });
  },

  findAll() {
    return prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, disabled: true, clientId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  update(
    id: string,
    data: { name?: string; disabled?: boolean; role?: Role; clientId?: string | null }
  ) {
    return prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, disabled: true, clientId: true, createdAt: true },
    });
  },
};
