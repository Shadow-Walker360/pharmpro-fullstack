import { Queue, Worker } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, unlink } from 'fs/promises';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getQueueConnection } from './connection';
import { s3, S3_BUCKET } from '../lib/s3';
import { env } from '../config/env';
import { logger } from '../lib/logger';

const execAsync = promisify(exec);

export const backupQueue = new Queue('backup', { connection: getQueueConnection() });

/**
 * Call once at server startup (from server.ts) to schedule the recurring
 * job — BullMQ's repeatable jobs survive process restarts because the
 * schedule itself lives in Redis, not in a setInterval that dies with the
 * process.
 */
export async function scheduleNightlyBackup() {
  await backupQueue.add(
    'nightly-backup',
    {},
    {
      repeat: { pattern: '0 2 * * *', tz: 'Africa/Nairobi' }, // 2:00 AM daily — outside pharmacy operating hours
      jobId: 'nightly-backup-recurring', // fixed ID prevents duplicate schedules if this is called more than once
    },
  );
  logger.info('Nightly backup scheduled for 02:00 Africa/Nairobi');
}

async function runPgDump(): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `/tmp/pharmpro-backup-${timestamp}.dump`;

  // Custom format (-Fc) is compressed and restorable with pg_restore,
  // unlike plain SQL dumps — smaller upload, faster restore.
  await execAsync(`pg_dump "${env.DATABASE_URL}" -Fc -f "${filename}"`);
  return filename;
}

export const backupWorker = new Worker(
  'backup',
  async (job) => {
    logger.info({ jobId: job.id }, 'Starting database backup');

    const localPath = await runPgDump();
    const buffer = await readFile(localPath);
    const key = `backups/pharmpro-${new Date().toISOString().slice(0, 10)}.dump`;

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ServerSideEncryption: 'AES256',
    }));

    await unlink(localPath); // clean up local temp file regardless of upload outcome

    logger.info({ key, sizeBytes: buffer.length }, 'Database backup uploaded to S3');
    return { key, sizeBytes: buffer.length };
  },
  {
    connection: getQueueConnection(),
    concurrency: 1, // never run two backups concurrently — pg_dump against a live DB is I/O heavy
  },
);

backupWorker.on('failed', (job, err) => {
  // A failed backup is a serious operational issue — this should also
  // trigger an alert (email/SMS to Super Admin), not just a log line.
  // Wire that in once email.job.ts / sms.job.ts are both deployed:
  //   await enqueueEmail({ to: adminEmail, subject: 'Backup FAILED', ... })
  logger.error({ jobId: job?.id, err }, 'DATABASE BACKUP FAILED — investigate immediately');
});

// Requires: pg_dump available on the server's PATH (matches your Postgres
// major version — mismatched versions between pg_dump and the DB server
// can fail silently on restore, not just on backup).
//
// Call scheduleNightlyBackup() once from server.ts after the app starts:
//   import { scheduleNightlyBackup } from './jobs/backup.job';
//   await scheduleNightlyBackup();