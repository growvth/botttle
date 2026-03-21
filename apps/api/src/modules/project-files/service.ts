import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { projectFileRepository } from './repository.js';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
]);

function uploadsRoot(): string {
  return path.resolve(process.cwd(), 'uploads');
}

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
    const rel = path.join('projects', projectId, `${randomUUID()}-${safe}`);
    const full = path.join(uploadsRoot(), rel);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, buffer);
    return projectFileRepository.create({
      projectId,
      uploadedById,
      filename: originalFilename,
      mimeType: mt,
      size: buffer.length,
      storagePath: rel.replace(/\\/g, '/'),
    });
  },

  async delete(id: string) {
    const row = await projectFileRepository.findById(id);
    if (!row) return null;
    const full = path.join(uploadsRoot(), row.storagePath);
    await projectFileRepository.delete(id);
    if (existsSync(full)) {
      try {
        await unlink(full);
      } catch {
        /* ignore */
      }
    }
    return { deleted: true };
  },

  getAbsolutePath(storagePath: string): string {
    return path.join(uploadsRoot(), storagePath);
  },
};
