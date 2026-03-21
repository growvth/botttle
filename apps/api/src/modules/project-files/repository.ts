import { prisma, type FileStorageProvider } from '@botttle/db';

export const projectFileRepository = {
  findManyByProjectId(projectId: string) {
    return prisma.projectFile.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, email: true, name: true } },
      },
    });
  },

  create(data: {
    projectId: string;
    uploadedById: string;
    filename: string;
    mimeType: string | null;
    size: number;
    storagePath: string;
    storageProvider: FileStorageProvider;
  }) {
    return prisma.projectFile.create({
      data,
      include: {
        uploadedBy: { select: { id: true, email: true, name: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.projectFile.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, email: true, name: true } },
      },
    });
  },

  delete(id: string) {
    return prisma.projectFile.delete({ where: { id } });
  },
};
