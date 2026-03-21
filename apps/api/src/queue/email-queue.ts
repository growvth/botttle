import { Queue } from 'bullmq';
import type { SendEmailPayload } from '../lib/send-email-resend.js';
import { redisConnectionOptions } from './connection.js';

const QUEUE_NAME = 'botttle-email';

let queue: Queue<SendEmailPayload> | null = null;

export function getEmailQueue(): Queue<SendEmailPayload> | null {
  const conn = redisConnectionOptions();
  if (!conn) return null;
  if (!queue) {
    queue = new Queue<SendEmailPayload>(QUEUE_NAME, { connection: conn });
  }
  return queue;
}

export async function enqueueEmail(payload: SendEmailPayload): Promise<void> {
  const q = getEmailQueue();
  if (!q) return;
  await q.add('send', payload, {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: 500,
    removeOnFail: 1000,
  });
}

export { QUEUE_NAME };
