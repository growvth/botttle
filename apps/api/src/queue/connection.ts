import type { ConnectionOptions } from 'bullmq';

export function redisConnectionOptions(): ConnectionOptions | null {
  const url = process.env['REDIS_URL']?.trim();
  if (!url) return null;
  return { url, maxRetriesPerRequest: null };
}
