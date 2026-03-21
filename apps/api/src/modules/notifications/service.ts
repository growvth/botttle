import { prisma, type NotificationKind } from '@botttle/db';
import { notificationRepository } from './repository.js';
import { notifyCollaboratorsByEmail } from '../../lib/email-notify.js';

function preview(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export const notificationService = {
  list(userId: string, limit = 40) {
    return notificationRepository.findManyForUser(userId, limit);
  },

  unreadCount(userId: string) {
    return notificationRepository.countUnread(userId);
  },

  markRead(userId: string, id: string) {
    return notificationRepository.markRead(userId, id);
  },

  markAllRead(userId: string) {
    return notificationRepository.markAllRead(userId);
  },

  async notifyProjectCollaborators(opts: {
    projectId: string;
    exceptUserId: string;
    kind: NotificationKind;
    title: string;
    body: string | null;
    linkPath: string;
  }): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: opts.projectId },
      select: { clientId: true },
    });
    if (!project) return;

    const [admins, clientUsers] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'ADMIN', disabled: false },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: { clientId: project.clientId, disabled: false },
        select: { id: true },
      }),
    ]);

    const ids = new Set<string>();
    for (const u of admins) ids.add(u.id);
    for (const u of clientUsers) ids.add(u.id);
    ids.delete(opts.exceptUserId);
    if (ids.size === 0) return;

    await notificationRepository.createMany(
      [...ids].map((userId) => ({
        userId,
        kind: opts.kind,
        title: opts.title,
        body: opts.body,
        linkHref: opts.linkPath,
        projectId: opts.projectId,
      }))
    );

    void notifyCollaboratorsByEmail({
      projectId: opts.projectId,
      exceptUserId: opts.exceptUserId,
      subject: opts.title,
      textBody: opts.body ?? opts.title,
      path: opts.linkPath,
    }).catch(() => {
      /* queue may be unavailable */
    });
  },

  async onCommentCreated(projectId: string, authorUserId: string, body: string): Promise<void> {
    const [project, author] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { title: true } }),
      prisma.user.findUnique({
        where: { id: authorUserId },
        select: { name: true, email: true },
      }),
    ]);
    if (!project) return;
    const label = author?.name?.trim() || author?.email || 'Someone';
    await notificationService.notifyProjectCollaborators({
      projectId,
      exceptUserId: authorUserId,
      kind: 'COMMENT',
      title: `${label} commented on ${project.title}`,
      body: preview(body, 160),
      linkPath: `/projects/${projectId}`,
    });
  },

  async onFileUploaded(projectId: string, uploadedById: string, filename: string): Promise<void> {
    const [project, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId }, select: { title: true } }),
      prisma.user.findUnique({
        where: { id: uploadedById },
        select: { name: true, email: true },
      }),
    ]);
    if (!project) return;
    const label = actor?.name?.trim() || actor?.email || 'Someone';
    await notificationService.notifyProjectCollaborators({
      projectId,
      exceptUserId: uploadedById,
      kind: 'FILE_UPLOAD',
      title: `${label} uploaded a file`,
      body: `${project.title}: ${filename}`,
      linkPath: `/projects/${projectId}`,
    });
  },
};
