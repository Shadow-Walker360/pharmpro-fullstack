// ════════════════════════════════════════════════════════════
// jobs/scheduled.worker.ts
// Cron jobs: expiry alerts, low stock check, daily backup
// ════════════════════════════════════════════════════════════

import { Worker, Job }      from 'bullmq'
import { QueueScheduler }   from 'bullmq'
import { scheduledQueue }   from './queues'
import { redis }            from '../config/redis'
import { prisma }           from '../config/prisma'
import { logger }           from '../lib/logger'

// Register cron jobs on startup
export async function registerCronJobs() {
  // ── Expiry check — daily at 07:00 EAT ─────────────────
  await scheduledQueue.add(
    'expiry-check',
    {},
    {
      repeat:    { cron: '0 4 * * *' },   // 07:00 EAT = 04:00 UTC
      jobId:     'expiry-check-daily',
      removeOnComplete: true,
    },
  )

  // ── Low stock check — every 6 hours ───────────────────
  await scheduledQueue.add(
    'low-stock-check',
    {},
    {
      repeat:    { every: 6 * 60 * 60 * 1000 },
      jobId:     'low-stock-check',
      removeOnComplete: true,
    },
  )

  // ── Daily backup — 01:00 EAT ──────────────────────────
  await scheduledQueue.add(
    'daily-backup',
    {},
    {
      repeat:    { cron: '0 22 * * *' },  // 01:00 EAT = 22:00 UTC prev day
      jobId:     'daily-backup',
      removeOnComplete: true,
    },
  )

  logger.info('✅ Cron jobs registered')
}

export function startScheduledWorker() {
  const worker = new Worker(
    'scheduled',
    async (job: Job) => {
      switch (job.name) {

        case 'expiry-check': {
          const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          const expiring = await prisma.inventory.findMany({
            where: {
              expiryDate:     { lte: in30, gte: new Date() },
              quantityOnHand: { gt: 0 },
            },
            include: {
              drug:   { select: { genericName: true } },
              branch: { select: { id: true, name: true } },
            },
          })

          for (const item of expiring) {
            const days = Math.ceil(
              (item.expiryDate!.getTime() - Date.now()) / 86_400_000,
            )
            logger.warn(
              { drugName: item.drug.genericName, days, branch: item.branch.name },
              'Expiry alert',
            )
            // TODO: publish to Redis → Socket.io broadcasts to branch
            await redis.publish(
              `branch:${item.branchId}:events`,
              JSON.stringify({
                event:    'inventory:expiry-alert',
                drugName: item.drug.genericName,
                daysLeft: days,
                qty:      item.quantityOnHand,
                batchNo:  item.batchNo,
              }),
            )
          }
          logger.info({ count: expiring.length }, 'Expiry check complete')
          break
        }

        case 'low-stock-check': {
          const lowStock = await prisma.inventory.findMany({
            where: {
              quantityOnHand: { gt: 0 },
              // can't use field reference directly in Prisma — use raw
            },
          })
          // Filter in JS (or use raw SQL for large datasets)
          const below = lowStock.filter(i => i.quantityOnHand <= i.reorderLevel)

          for (const item of below) {
            await redis.publish(
              `branch:${item.branchId}:events`,
              JSON.stringify({
                event:    'inventory:low-stock',
                drugId:   item.drugId,
                qty:      item.quantityOnHand,
                reorder:  item.reorderLevel,
              }),
            )
          }
          logger.info({ count: below.length }, 'Low stock check complete')
          break
        }

        case 'daily-backup': {
          // In production: pg_dump → gzip → upload to S3
          logger.info('Daily backup job started')
          // Implementation in jobs/backup.worker.ts
          break
        }
      }
    },
    { connection: redis, concurrency: 1 },
  )

  worker.on('failed', (job, err) =>
    logger.error({ jobId: job?.id, name: job?.name, err }, 'Scheduled job failed'),
  )

  return worker
}


