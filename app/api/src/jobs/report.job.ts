import { Queue, Worker, type Job } from 'bullmq';
import { getQueueConnection } from './connection';
import { prisma } from '../config/prisma';
import { logger } from '../lib/logger';
import { enqueueEmail } from './email.job';
import { uploadToS3, getPresignedDownloadUrl } from '../lib/s3';

export const reportQueue = new Queue('report', { connection: getQueueConnection() });

// ── Nightly end-of-day summary ──────────────────────────────────────────
export async function scheduleEndOfDaySummary() {
  await reportQueue.add(
    'end-of-day-summary',
    {},
    {
      repeat: { pattern: '0 21 * * *', tz: 'Africa/Nairobi' }, // 9:00 PM daily, after most pharmacies close
      jobId: 'end-of-day-summary-recurring',
    },
  );
  logger.info('End-of-day summary scheduled for 21:00 Africa/Nairobi');
}

interface ExportJobData {
  type: 'ASYNC_EXPORT';
  reportType: string;
  branchId: string;
  from: string;
  to: string;
  format: 'pdf' | 'csv' | 'xlsx';
  requestedByEmail: string;
}

/**
 * For report ranges too large to generate synchronously inside an HTTP
 * request (the reports.module.ts export route is fine for a month of
 * data; a full year of sales line items is not) — queues generation and
 * emails a download link when ready instead of holding the connection open.
 */
export async function enqueueAsyncExport(data: Omit<ExportJobData, 'type'>) {
  await reportQueue.add('async-export', { type: 'ASYNC_EXPORT', ...data }, {
    attempts: 2,
    removeOnComplete: { count: 50 },
  });
}

export const reportWorker = new Worker(
  'report',
  async (job: Job) => {
    if (job.name === 'end-of-day-summary') {
      return runEndOfDaySummary();
    }
    if (job.name === 'async-export') {
      return runAsyncExport(job.data as ExportJobData);
    }
    logger.warn({ jobName: job.name }, 'Unknown report job type');
  },
  {
    connection: getQueueConnection(),
    concurrency: 2, // PDF/report generation is CPU-bound — kept low deliberately
  },
);

async function runEndOfDaySummary() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const branch of branches) {
    const [salesAgg, rxCount, lowStockCount] = await Promise.all([
      prisma.sale.aggregate({
        where: { branchId: branch.id, createdAt: { gte: today }, status: 'COMPLETED' },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.prescription.count({ where: { branchId: branch.id, dispensedAt: { gte: today } } }),
      prisma.inventory.count({ where: { branchId: branch.id, quantityOnHand: { lte: 10 } } }),
    ]);

    const managers = await prisma.user.findMany({
      where: { branchId: branch.id, role: { in: ['SUPER_ADMIN', 'PHARMACIST'] }, isActive: true },
      select: { email: true },
    });

    const html = `
      <h2>End-of-Day Summary — ${branch.name}</h2>
      <p><strong>${today.toDateString()}</strong></p>
      <ul>
        <li>Transactions: ${salesAgg._count}</li>
        <li>Revenue: KES ${(salesAgg._sum.totalAmount ?? 0).toLocaleString('en-KE')}</li>
        <li>Prescriptions dispensed: ${rxCount}</li>
        <li>Drugs at/below low-stock threshold: ${lowStockCount}</li>
      </ul>
    `;

    for (const manager of managers) {
      if (manager.email) {
        await enqueueEmail({ to: manager.email, subject: `[PharmPro] End-of-Day Summary — ${branch.name}`, html, purpose: 'REPORT_EXPORT' });
      }
    }
  }

  logger.info({ branchCount: branches.length }, 'End-of-day summaries queued for email');
}

async function runAsyncExport(data: ExportJobData) {
  // Reuses the same report-building logic as the synchronous export route —
  // import lazily to avoid a circular import between reports.module.ts and
  // this job file (the route module also imports enqueueAsyncExport from here).
  const { buildReportForExport, renderExport } = await import('../modules/reports/reports.module');

  const report = await buildReportForExport(data.reportType as any, data.branchId, data.from, data.to);
  const buffer = await renderExport(report, data.format, data.reportType);

  const key = await uploadToS3({
    buffer: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any),
    mimeType: data.format === 'pdf' ? 'application/pdf' : data.format === 'xlsx'
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
    branchId: data.branchId,
    category: 'receipts',
  });

  const downloadUrl = await getPresignedDownloadUrl(key, 60 * 60 * 24); // 24-hour link for an emailed report

  await enqueueEmail({
    to: data.requestedByEmail,
    subject: `[PharmPro] Your ${data.reportType} report is ready`,
    html: `<p>Your requested report is ready. <a href="${downloadUrl}">Download it here</a> (link expires in 24 hours).</p>`,
    purpose: 'REPORT_EXPORT',
  });

  logger.info({ key, reportType: data.reportType }, 'Async report export complete');
}

reportWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, jobName: job?.name, err }, 'Report job failed');
});

// Call scheduleEndOfDaySummary() once from server.ts after the app starts.
//
// NOTE: this assumes reports.module.ts exports `buildReportForExport` and
// `renderExport` as reusable functions rather than keeping the report-
// building logic private to the route handler — refactor reports.module.ts
// to export those two functions if it doesn't already, so both the sync
// export route and this async job call the same underlying code.