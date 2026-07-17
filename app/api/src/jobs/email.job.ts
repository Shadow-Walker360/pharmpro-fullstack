import { Queue, Worker, type Job } from 'bullmq';
import nodemailer, { type Transporter } from 'nodemailer';
import { getQueueConnection } from './connection';
import { env } from '../config/env';
import { logger } from '../lib/logger';

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer | string; contentType?: string }[];
  purpose: 'RECEIPT' | 'REPORT_EXPORT' | 'STAFF_INVITE' | 'PASSWORD_RESET' | 'GENERIC';
}

export const emailQueue = new Queue<EmailJobData>('email', { connection: getQueueConnection() });

export async function enqueueEmail(data: EmailJobData) {
  if (env.NODE_ENV === 'test') return;
  await emailQueue.add('send-email', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 200 },
  });
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    // SMTP config is intentionally read from generic env vars rather than
    // hardcoding a provider — works with SES SMTP, SendGrid, or Mailgun
    // without code changes, just different .env values.
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === '465',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export const emailWorker = new Worker<EmailJobData>(
  'email',
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, attachments, purpose } = job.data;

    const info = await getTransporter().sendMail({
      from: process.env.SMTP_FROM ?? 'PharmPro <no-reply@pharmpro.co.ke>',
      to,
      subject,
      html,
      attachments,
    });

    logger.info({ jobId: job.id, purpose, messageId: info.messageId }, 'Email sent');
    return info;
  },
  {
    connection: getQueueConnection(),
    concurrency: 5,
  },
);

emailWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err, purpose: job?.data?.purpose }, 'Email job failed after retries');
});

// Dependencies: npm install bullmq nodemailer
// Env required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// (add these to env.ts's schema if you want them validated at startup —
// left as raw process.env reads here since email is often optional/later-stage)