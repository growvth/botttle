import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { projectFileRepository } from './repository.js';
import { notificationService } from '../notifications/service.js';
import {
  activeFileStorage,
  deleteStoredFile,
  getFileReadStream,
  localUploadsPath,
  storeProjectFile,
} from '../../lib/file-storage.js';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
]);

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, '_');
  return base.slice(0, 200) || 'file';
}

export const projectFileService = {
  listByProject(projectId: string) {
    return projectFileRepository.findManyByProjectId(projectId);
  },

  async saveUpload(
    projectId: string,
    uploadedById: string,
    buffer: Buffer,
    originalFilename: string,
    mimeType: string | null
  ) {
    const mt = mimeType ?? 'application/octet-stream';
    if (!ALLOWED_MIME.has(mt)) {
      throw new Error('UNSUPPORTED_TYPE');
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new Error('FILE_TOO_LARGE');
    }
    const safe = sanitizeFilename(originalFilename);
    const rel = path.join('projects', projectId, `${randomUUID()}-${safe}`).replace(/\\/g, '/');

    let provider: 'LOCAL' | 'S3';
    try {
      const stored = await storeProjectFile(rel, buffer, mt);
      provider = stored.provider;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'S3_NOT_CONFIGURED') {
        throw new Error('S3_NOT_CONFIGURED');
      }
      throw e;
    }

    const row = await projectFileRepository.create({
      projectId,
      uploadedById,
      filename: originalFilename,
      mimeType: mt,
      size: buffer.length,
      storagePath: rel,
      storageProvider: provider,
    });
    try {
      await notificationService.onFileUploaded(projectId, uploadedById, originalFilename);
    } catch {
      /* best-effort */
    }
    return row;
  },

  async delete(id: string) {
    const row = await projectFileRepository.findById(id);
    if (!row) return null;
    await projectFileRepository.delete(id);
    await deleteStoredFile(row.storagePath, row.storageProvider);
    return { deleted: true };
  },

  async getReadStreamForRow(row: { storagePath: string; storageProvider: 'LOCAL' | 'S3' }) {
    return getFileReadStream(row.storagePath, row.storageProvider);
  },

  getAbsolutePathForLocal(storagePath: string): string {
    return localUploadsPath(storagePath);
  },

  fileExistsLocally(storagePath: string): boolean {
    return existsSync(localUploadsPath(storagePath));
  },
};
