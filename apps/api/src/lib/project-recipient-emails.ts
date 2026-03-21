import { prisma } from '@botttle/db';

export async function collaboratorEmails(
  projectId: string,
  exceptUserId: string
): Promise<{ email: string; name: string | null }[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientId: true },
  });
  if (!project) return [];

  const users = await prisma.user.findMany({
    where: {
      disabled: false,
      NOT: { id: exceptUserId },
      OR: [{ role: 'ADMIN' }, { clientId: project.clientId }],
    },
    select: { email: true, name: true },
  });

  return users.filter((u): u is { email: string; name: string | null } => Boolean(u.email));
}

export async function clientUserEmailsForClientId(
  clientId: string
): Promise<{ email: string; name: string | null }[]> {
  const users = await prisma.user.findMany({
    where: { disabled: false, clientId },
    select: { email: true, name: true },
  });
  return users.filter((u): u is { email: string; name: string | null } => Boolean(u.email));
}
