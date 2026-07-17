import { Queue, Worker } from 'bullmq';
import { getQueueConnection } from './connection';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { logger } from '../lib/logger';
import { enqueueSms } from './sms.job';
import { enqueueEmail } from './email.job';

export const expiryQueue = new Queue('expiry', { connection: getQueueConnection() });

export async function scheduleExpiryCheck() {
  await expiryQueue.add(
    'check-expiring-batches',
    {},
    {
      repeat: { pattern: '0 6 * * *', tz: 'Africa/Nairobi' }, // 6:00 AM daily, before the pharmacy opens
      jobId: 'expiry-check-recurring',
    },
  );
  logger.info('Expiry check scheduled for 06:00 Africa/Nairobi');
}

export const expiryWorker = new Worker(
  'expiry',
  async (job) => {
    // Every branch has its own configured warning window (Settings module) —
    // this loops branches rather than using one global constant.
    const branches = await prisma.branch.findMany({ select: { id: true, settings: true, name: true } });

    let totalFlagged = 0;

    for (const branch of branches) {
      const settings = (branch.settings as any) ?? {};
      const warningDays = settings.expiryWarningDays ?? 90;
      const notifyEnabled = settings.notifyExpiry ?? true;
      if (!notifyEnabled) continue;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + warningDays);

      const expiringBatches = await prisma.medicationBatch.findMany({
        where: {
          branchId: branch.id,
          expiryDate: { lte: cutoff, gte: new Date() },
          isRecalled: false,
          quantityRemaining: { gt: 0 },
        },
        include: { drug: { select: { name: true } } },
      });

      if (expiringBatches.length === 0) continue;
      totalFlagged += expiringBatches.length;

      // De-dupe: don't re-notify about the same batch every single night —
      // only when it first enters the window, tracked via a Redis SET
      // with a TTL matching the warning window itself.
      const newlyFlagged = [];
      for (const batch of expiringBatches) {
        const seenKey = `expiry-notified:${batch.id}`;
        const alreadyNotified = await redis.get(seenKey);
        if (!alreadyNotified) {
          newlyFlagged.push(batch);
          await redis.set(seenKey, '1', 'EX', warningDays * 24 * 60 * 60);
        }
      }
      if (newlyFlagged.length === 0) continue;

      const pharmacists = await prisma.user.findMany({
        where: { branchId: branch.id, role: { in: ['PHARMACIST', 'SUPER_ADMIN'] }, isActive: true },
        select: { email: true, fullName: true },
      });

      const summaryHtml = `
        <h2>Expiry Warning — ${branch.name}</h2>
        <p>${newlyFlagged.length} batch(es) newly entering the ${warningDays}-day expiry window:</p>
        <ul>${newlyFlagged.map((b) => `<li>${b.drug.name} — Batch ${b.batchNo} — expires ${b.expiryDate.toDateString()} — ${b.quantityRemaining} units remaining</li>`).join('')}</ul>
      `;

      for (const pharmacist of pharmacists) {
        if (pharmacist.email) {
          await enqueueEmail({
            to: pharmacist.email,
            subject: `[PharmPro] ${newlyFlagged.length} batch(es) expiring soon at ${branch.name}`,
            html: summaryHtml,
            purpose: 'GENERIC',
          });
        }
      }
    }

    logger.info({ totalFlagged }, 'Expiry check complete');
    return { totalFlagged };
  },
  { connection: getQueueConnection(), concurrency: 1 },
);

expiryWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Expiry check job failed');
});

/**
 * Also exports a manually-triggerable refill-reminder pass — separate
 * from the batch-expiry check above, but lives here since it shares the
 * "scan and notify" shape. Call this from a second repeatable schedule
 * if you want refill reminders on a different cadence than expiry checks.
 */
export async function sendRefillReminders(branchId: string) {
  const { getPatientsWithOverdueRefills } = await import('../modules/patients/patients.service');
  const overdue = await getPatientsWithOverdueRefills(branchId);

  for (const patient of overdue) {
    if (patient.phone) {
      await enqueueSms({
        to: patient.phone,
        message: `Hi ${patient.fullName}, your medication refill is now due. Visit us or call to arrange a refill.`,
        branchId,
        purpose: 'REFILL_REMINDER',
      });
    }
  }
  return { remindersSent: overdue.length };
}

// Call scheduleExpiryCheck() once from server.ts after the app starts.