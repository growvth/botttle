import { prisma, type NotificationKind } from '@botttle/db';

export const notificationRepository = {
  createMany(
    rows: Array<{
      userId: string;
      kind: NotificationKind;
      title: string;
      body: string | null;
      linkHref: string | null;
      projectId: string | null;
    }>
  ) {
    if (rows.length === 0) return { count: 0 };
    return prisma.notification.createMany({ data: rows });
  },

  findManyForUser(userId: string, limit: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  },

  countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, readAt: null },
    });
  },

  markRead(userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  },
};
