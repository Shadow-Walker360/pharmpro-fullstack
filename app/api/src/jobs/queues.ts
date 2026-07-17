// ════════════════════════════════════════════════════════════
// jobs/queues.ts
// Central queue definitions — one place for all BullMQ queues.
// Workers defined in separate files (jobs/*.worker.ts)
// ════════════════════════════════════════════════════════════

import { Queue } from 'bullmq'
import { redis } from '../config/redis'

const connection = redis

// Default job options — all jobs retry 3x with exponential backoff
const defaultJobOptions = {
  attempts:         3,
  backoff:          { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: { count: 100 },   // keep last 100 completed
  removeOnFail:     { count: 500 },   // keep last 500 failed for debugging
}

// ── Prescription events ───────────────────────────────────
export const rxQueue = new Queue('prescriptions', {
  connection,
  defaultJobOptions,
})

// ── Notification queue (SMS + Email) ─────────────────────
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions,
})

// ── Report generation queue ───────────────────────────────
export const reportQueue = new Queue('reports', {
  connection,
  defaultJobOptions,
})

// ── Backup queue ──────────────────────────────────────────
export const backupQueue = new Queue('backups', {
  connection,
  defaultJobOptions,
})

// ── Scheduled jobs (cron-like) ────────────────────────────
export const scheduledQueue = new Queue('scheduled', {
  connection,
  defaultJobOptions,
})


