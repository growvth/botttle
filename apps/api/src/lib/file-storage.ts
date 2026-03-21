import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { FileStorageProvider } from '@botttle/db';

function uploadsRoot(): string {
  return path.resolve(process.cwd(), 'uploads');
}

export function activeFileStorage(): 'local' | 's3' {
  const v = process.env['FILE_STORAGE']?.trim().toLowerCase();
  return v === 's3' ? 's3' : 'local';
}

function s3Client(): S3Client | null {
  const bucket = process.env['S3_BUCKET']?.trim();
  const region = process.env['S3_REGION']?.trim() || 'us-east-1';
  if (!bucket) return null;
  return new S3Client({
    region,
    ...(process.env['S3_ENDPOINT'] ? { endpoint: process.env['S3_ENDPOINT'], forcePathStyle: true } : {}),
  });
}

export function s3Bucket(): string | null {
  const b = process.env['S3_BUCKET']?.trim();
  return b || null;
}

export async function storeProjectFile(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<{ provider: FileStorageProvider }> {
  if (activeFileStorage() === 's3') {
    const client = s3Client();
    const bucket = s3Bucket();
    if (!client || !bucket) {
      throw new Error('S3_NOT_CONFIGURED');
    }
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
    return { provider: 'S3' };
  }

  const full = path.join(uploadsRoot(), key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buffer);
  return { provider: 'LOCAL' };
}

export async function deleteStoredFile(key: string, provider: FileStorageProvider): Promise<void> {
  if (provider === 'S3') {
    const client = s3Client();
    const bucket = s3Bucket();
    if (!client || !bucket) return;
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  const full = path.join(uploadsRoot(), key);
  if (existsSync(full)) {
    try {
      await unlink(full);
    } catch {
      /* ignore */
    }
  }
}

export async function getFileReadStream(
  key: string,
  provider: FileStorageProvider
): Promise<Readable> {
  if (provider === 'S3') {
    const client = s3Client();
    const bucket = s3Bucket();
    if (!client || !bucket) {
      throw new Error('S3_NOT_CONFIGURED');
    }
    const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = out.Body;
    if (body && typeof (body as NodeJS.ReadableStream).pipe === 'function') {
      return body as Readable;
    }
    throw new Error('S3_EMPTY_BODY');
  }
  const full = path.join(uploadsRoot(), key);
  return createReadStream(full);
}

export function localUploadsPath(key: string): string {
  return path.join(uploadsRoot(), key);
}
