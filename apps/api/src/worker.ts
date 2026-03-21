import { Worker } from 'bullmq';
import { sendEmailViaResend } from './lib/send-email-resend.js';
import { QUEUE_NAME } from './queue/email-queue.js';
import { redisConnectionOptions } from './queue/connection.js';

const conn = redisConnectionOptions();
if (!conn) {
  console.error('REDIS_URL is not set; email worker exiting.');
  process.exit(1);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const r = await sendEmailViaResend(job.data);
    if (!r.ok) {
      throw new Error(r.error ?? 'send failed');
    }
  },
  { connection: conn }
);

worker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} failed`, err);
});

console.log(`Email worker listening on queue "${QUEUE_NAME}"`);
