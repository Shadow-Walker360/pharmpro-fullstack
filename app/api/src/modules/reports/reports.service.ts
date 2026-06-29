// ════════════════════════════════════════════════════════════
// modules/reports/reports.service.ts
// Unified report generation — all heavy queries here.
// Each report is cached and optionally queued as PDF.
// ════════════════════════════════════════════════════════════
import { prisma }       from '../../config/prisma'
import { redis }        from '../../config/redis'
import { reportQueue }  from '../../jobs/queues'
import { z }            from 'zod'

export const reportParamsSchema = z.object({
  type: z.enum([
    'SALES','INVENTORY','PRESCRIPTIONS',
    'PATIENTS','FINANCIAL','COMPLIANCE','CONTROLLED',
  ]),
  from:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.enum(['json','csv','pdf']).default('json'),
})

export type ReportParams = z.infer<typeof reportParamsSchema>

export class ReportsService {

  async generate(params: ReportParams, branchId: string, requestedById: string) {
    const cacheKey = `report:${branchId}:${params.type}:${params.from}:${params.to}`
    const cached   = await redis.get(cacheKey)

    let data: any

    if (cached && params.format === 'json') {
      data = JSON.parse(cached)
    } else {
      data = await this.buildReport(params, branchId)
      await redis.setex(cacheKey, 600, JSON.stringify(data))
    }

    // Queue PDF generation if requested
    if (params.format === 'pdf') {
      const job = await reportQueue.add('generate-report-pdf', {
        params, branchId, requestedById, data,
      }, { attempts: 3 })

      return {
        queued:  true,
        jobId:   job.id,
        message: 'PDF report is being generated. Check /api/reports/jobs/:jobId for status.',
      }
    }

    return { data, generatedAt: new Date().toISOString() }
  }

  private async buildReport(params: ReportParams, branchId: string) {
    const from = new Date(`${params.from}T00:00:00.000Z`)
    const to   = new Date(`${params.to}T23:59:59.999Z`)

    switch (params.type) {

      case 'SALES': {
        const [summary, byDay, byMethod, topItems] = await prisma.$transaction([
          prisma.sale.aggregate({
            where: { branchId, status: 'COMPLETED', createdAt: { gte: from, lte: to } },
            _sum:   { total: true, discount: true, vat: true },
            _count: { id: true },
          }),
          prisma.$queryRaw`
            SELECT DATE(created_at AT TIME ZONE 'Africa/Nairobi') date,
                   SUM(total)::numeric revenue, COUNT(*)::int txns
            FROM sales
            WHERE branch_id=${branchId} AND status='COMPLETED'
              AND created_at BETWEEN ${from} AND ${to}
            GROUP BY 1 ORDER BY 1
          `,
          prisma.payment.groupBy({
            by:    ['method'],
            where: { status:'COMPLETED', sale:{ branchId, status:'COMPLETED', createdAt:{ gte:from, lte:to } } },
            _sum:  { amount: true }, _count: { id: true },
          }),
          prisma.saleItem.groupBy({
            by:    ['drugId'],
            where: { sale:{ branchId, createdAt:{ gte:from, lte:to } } },
            _sum:  { quantity: true, subtotal: true },
            orderBy:{ _sum:{ subtotal:'desc' } },
            take:  10,
          }),
        ])
        return { summary, byDay, byMethod, topItems }
      }

      case 'INVENTORY': {
        const [lowStock, expiring, movements, valuation] = await prisma.$transaction([
          prisma.inventory.findMany({
            where:   { branchId, quantityOnHand:{ gt:0, lte:20 } },
            include: { drug:{ select:{ genericName:true } } },
            orderBy: { quantityOnHand:'asc' },
          }),
          prisma.inventory.findMany({
            where:   { branchId, expiryDate:{ lte: new Date(Date.now() + 30*86400000), gte: new Date() } },
            include: { drug:{ select:{ genericName:true } } },
            orderBy: { expiryDate:'asc' },
          }),
          prisma.inventoryTransaction.groupBy({
            by:    ['type'],
            where: { branchId, createdAt:{ gte:from, lte:to } },
            _sum:  { quantity: true },
            _count:{ id: true },
          }),
          prisma.$queryRaw`
            SELECT SUM(quantity_on_hand * unit_cost)::numeric cost_value,
                   SUM(quantity_on_hand * selling_price)::numeric sell_value
            FROM inventory WHERE branch_id=${branchId}
          `,
        ])
        return { lowStock, expiring, movements, valuation }
      }

      case 'PRESCRIPTIONS': {
        const [byStatus, byPriority, dispensed, refills] = await prisma.$transaction([
          prisma.prescription.groupBy({
            by:    ['status'],
            where: { branchId, createdAt:{ gte:from, lte:to }, deletedAt:null },
            _count:{ id: true },
          }),
          prisma.prescription.groupBy({
            by:    ['priority'],
            where: { branchId, createdAt:{ gte:from, lte:to }, deletedAt:null },
            _count:{ id: true },
          }),
          prisma.prescription.count({
            where: { branchId, status:'DISPENSED', dispensedAt:{ gte:from, lte:to } },
          }),
          prisma.prescriptionRefill.count({
            where: { dispensedAt:{ gte:from, lte:to } },
          }),
        ])
        return { byStatus, byPriority, dispensed, refills }
      }

      case 'PATIENTS': {
        const [total, newPatients, byCondition, adherenceRisk] = await prisma.$transaction([
          prisma.patient.count({ where:{ branchId, deletedAt:null } }),
          prisma.patient.count({
            where:{ branchId, deletedAt:null, createdAt:{ gte:from, lte:to } },
          }),
          prisma.$queryRaw`
            SELECT unnest(chronic_conditions) condition, COUNT(*)::int count
            FROM patients WHERE branch_id=${branchId} AND deleted_at IS NULL
              AND cardinality(chronic_conditions) > 0
            GROUP BY 1 ORDER BY 2 DESC LIMIT 10
          `,
          // Patients with chronic conditions who have not visited recently
          prisma.patient.count({
            where:{
              branchId, deletedAt:null,
              chronicConditions:{ isEmpty:false },
              sales:{ none:{ createdAt:{ gte: new Date(Date.now() - 45*86400000) } } },
            },
          }),
        ])
        return { total, newPatients, byCondition, adherenceRisk }
      }

      case 'CONTROLLED': {
        return prisma.controlledSubstanceLog.findMany({
          where:   { branchId, dispensedAt:{ gte:from, lte:to } },
          orderBy: { dispensedAt:'desc' },
          include: { dispensedBy:{ select:{ firstName:true, lastName:true } } },
        })
      }

      default:
        return { message: 'Report type not yet implemented' }
    }
  }

  async getJobStatus(jobId: string) {
    const job = await reportQueue.getJob(jobId)
    if (!job) throw Object.assign(new Error('Job not found'), { status: 404 })
    const state = await job.getState()
    return { jobId, state, progress: job.progress, result: job.returnvalue }
  }
}

export const reportsService = new ReportsService()


