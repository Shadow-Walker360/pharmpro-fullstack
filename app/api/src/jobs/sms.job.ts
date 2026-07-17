import { Queue, Worker, type Job } from 'bullmq';
import africastalking from 'africastalking';
import { getQueueConnection } from './connection';
import { env } from '../config/env';
import { logger } from '../lib/logger';

interface SmsJobData {
  to: string;           // E.164 or local Kenyan format — normalized below
  message: string;
  branchId: string;
  purpose: 'REFILL_REMINDER' | 'PRESCRIPTION_READY' | 'LOW_STOCK_ALERT' | 'GENERIC';
}

export const smsQueue = new Queue<SmsJobData>('sms', { connection: getQueueConnection() });

export async function enqueueSms(data: SmsJobData) {
  if (env.NODE_ENV === 'test') return; // never actually send SMS during tests
  await smsQueue.add('send-sms', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 }, // last 500 kept for debugging, not unbounded
  });
}

function normalizeKenyanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('254')) return `+${digits}`;
  if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `+254${digits}`;
  return phone; // already looks international, or a non-Kenyan format — leave it
}

let atClient: ReturnType<typeof africastalking> | null = null;
function getClient() {
  if (!env.AT_API_KEY || !env.AT_USERNAME) {
    throw new Error('Africa\'s Talking credentials not configured (AT_API_KEY / AT_USERNAME)');
  }
  if (!atClient) atClient = africastalking({ apiKey: env.AT_API_KEY, username: env.AT_USERNAME });
  return atClient;
}

/**
 * Concurrency 5, and Africa's Talking's own rate limit (20/sec on most
 * plans) enforced via BullMQ's limiter — not just application-level
 * throttling, since a burst of refill reminders after a nightly cron run
 * is exactly the scenario that would otherwise trip the provider's cap.
 */
export const smsWorker = new Worker<SmsJobData>(
  'sms',
  async (job: Job<SmsJobData>) => {
    const { to, message, purpose } = job.data;
    const client = getClient();

    const result = await client.SMS.send({
      to: [normalizeKenyanPhone(to)],
      message,
    });

    logger.info({ jobId: job.id, purpose, result }, 'SMS sent');
    return result;
  },
  {
    connection: getQueueConnection(),
    concurrency: 5,
    limiter: { max: 20, duration: 1000 },
  },
);

smsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err, data: job?.data }, 'SMS job failed after retries');
});

// Dependencies: npm install bullmq africastalking
// Env required: AT_API_KEY, AT_USERNAME (see env.ts)