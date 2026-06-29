// ════════════════════════════════════════════════════════════
// modules/audit/audit.service.ts
//
// Read-only — the audit log is immutable.
// Nobody can update or delete audit log rows.
// Load: all queries use indexed columns (branchId, createdAt,
//       entityType, userId). Paginated. Redis-cached summaries.
// ════════════════════════════════════════════════════════════
import { prisma }   from '../../config/prisma'
import { redis }    from '../../config/redis'
import { z }        from 'zod'

export const auditSearchSchema = z.object({
  userId:     z.string().uuid().optional(),
  entityType: z.string().optional(),
  action:     z.enum([
    'CREATE','UPDATE','DELETE','VIEW','LOGIN',
    'LOGOUT','DISPENSE','OVERRIDE_WARNING','EXPORT','PRINT',
  ]).optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
  q:          z.string().optional(),
  page:       z.coerce.number().default(1),
  limit:      z.coerce.number().min(1).max(200).default(50),
})

export type AuditSearchInput = z.infer<typeof auditSearchSchema>

export class AuditService {

  async search(input: AuditSearchInput, branchId: string) {
    const { userId, entityType, action, from, to, q, page, limit } = input
    const skip = (page - 1) * limit

    const where: any = {
      branchId,
      ...(userId     && { userId }),
      ...(entityType && { entityType }),
      ...(action     && { action: action as any }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
          ...(to   && { lte: new Date(`${to}T23:59:59.999Z`)   }),
        },
      }),
    }

    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ])

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  }

  async getReadLog(branchId: string, patientId?: string) {
    return prisma.readAuditLog.findMany({
      where: {
        branchId,
        ...(patientId && { patientId }),
      },
      orderBy: { createdAt: 'desc' },
      take:    200,
      include: {
        user:    { select: { firstName: true, lastName: true, role: true } },
        patient: { select: { firstName: true, lastName: true } },
      },
    })
  }

  async getControlledLog(branchId: string) {
    return prisma.controlledSubstanceLog.findMany({
      where:   { branchId },
      orderBy: { dispensedAt: 'desc' },
      take:    200,
      include: {
        dispensedBy: { select: { firstName: true, lastName: true } },
      },
    })
  }

  async getSummary(branchId: string) {
    const cacheKey = `audit:summary:${branchId}`
    const cached   = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const today    = new Date()
    const dayStart = new Date(today.setHours(0, 0, 0, 0))

    const [todayCount, byAction, byUser, failedLogins] = await prisma.$transaction([
      prisma.auditLog.count({
        where: { branchId, createdAt: { gte: dayStart } },
      }),
      prisma.auditLog.groupBy({
        by:      ['action'],
        where:   { branchId, createdAt: { gte: dayStart } },
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.auditLog.groupBy({
        by:      ['userId'],
        where:   { branchId, createdAt: { gte: dayStart } },
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
        take:    5,
      }),
      // Failed login attempts today
      prisma.auditLog.count({
        where: {
          branchId,
          action:     'LOGIN',
          entityType: 'FailedLogin',
          createdAt:  { gte: dayStart },
        },
      }),
    ])

    const summary = { todayCount, byAction, byUser, failedLogins }
    await redis.setex(cacheKey, 60, JSON.stringify(summary)) // 1min cache
    return summary
  }

  async exportCsv(branchId: string, from: string, to: string): Promise<string> {
    const logs = await prisma.auditLog.findMany({
      where: {
        branchId,
        createdAt: {
          gte: new Date(`${from}T00:00:00.000Z`),
          lte: new Date(`${to}T23:59:59.999Z`),
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
      take:    10_000, // safety cap
    })

    // Build CSV
    const header = 'Date,User,Role,Action,Entity,EntityId,IP\n'
    const rows   = logs.map(l =>
      [
        l.createdAt.toISOString(),
        `${l.user.firstName} ${l.user.lastName}`,
        l.user.role,
        l.action,
        l.entityType,
        l.entityId,
        l.ipAddress ?? '',
      ].join(','),
    ).join('\n')

    return header + rows
  }
}

export const auditService = new AuditService()


