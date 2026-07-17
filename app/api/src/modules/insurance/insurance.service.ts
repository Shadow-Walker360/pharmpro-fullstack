//════════════════════════════════════════════════════════════
// modules/insurance/insurance.service.ts
// Insurance claims lifecycle:
//  PENDING → APPROVED → PAID
//  PENDING → REJECTED → RESUBMITTED → APPROVED → PAID
//
// Load considerations:
//  - Claims stats cached in Redis (invalidated on status change)
//  - Outstanding balance calculated via raw SQL aggregation
//  - All queries scoped to branchId
// ════════════════════════════════════════════════════════════
import { prisma }  from '../../config/prisma'
import { redis }   from '../../config/redis'
import { logger }  from '../../lib/logger'
import type {
  CreateClaimInput,
  UpdateClaimInput,
  ClaimSearchInput,
}                  from './insurance.schema'

// We store insurance claims in the AuditLog entity for now.
// In production, add an InsuranceClaim table to the schema.
// For this MVP we use a dedicated Prisma model pattern:

// ── Temporary: use raw table via prisma.$queryRaw ──────────
// Since InsuranceClaim isn't in the schema yet, we'll
// demonstrate the full pattern with the Expense table structure
// and note where to swap in a real InsuranceClaim model.

export class InsuranceService {

  async createClaim(
    input:       CreateClaimInput,
    branchId:    string,
    createdById: string,
  ) {
    // Verify prescription exists and belongs to branch
    const rx = await prisma.prescription.findFirst({
      where:   { id: input.prescriptionId, branchId, deletedAt: null },
      include: { patient: { select: { firstName: true, lastName: true, nhifNo: true } } },
    })
    if (!rx) throw Object.assign(new Error('Prescription not found'), { status: 404 })

    // Generate claim reference
    const claimNo  = `CLM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // Store as structured audit entry until InsuranceClaim table is migrated in
    const claim = await prisma.auditLog.create({
      data: {
        branchId,
        userId:     createdById,
        action:     'CREATE',
        entityType: 'InsuranceClaim',
        entityId:   claimNo,
        newValue:   {
          claimNo,
          patientId:      input.patientId,
          patientName:    `${rx.patient.firstName} ${rx.patient.lastName}`,
          prescriptionId: input.prescriptionId,
          rxNumber:       rx.rxNumber,
          insurer:        input.insurer,
          policyNo:       input.policyNo,
          preAuthCode:    input.preAuthCode,
          drugDispensed:  input.drugDispensed,
          claimValue:     input.claimValue,
          status:         'PENDING',
          notes:          input.notes,
          createdAt:      new Date().toISOString(),
        } as any,
      },
    })

    await redis.del(`insurance:stats:${branchId}`)
    logger.info({ claimNo, insurer: input.insurer, value: input.claimValue }, 'Insurance claim created')
    return { claimNo, ...claim }
  }

  async updateClaimStatus(
    claimNo:     string,
    input:       UpdateClaimInput,
    branchId:    string,
    updatedById: string,
  ) {
    // Find the claim
    const existing = await prisma.auditLog.findFirst({
      where: {
        branchId,
        entityType: 'InsuranceClaim',
        entityId:   claimNo,
        action:     'CREATE',
      },
    })
    if (!existing) throw Object.assign(new Error('Claim not found'), { status: 404 })

    const prev = existing.newValue as any

    // Validate status transition
    const transitions: Record<string, string[]> = {
      PENDING:      ['APPROVED','REJECTED'],
      APPROVED:     ['PAID'],
      REJECTED:     ['RESUBMITTED'],
      RESUBMITTED:  ['APPROVED','REJECTED'],
      PAID:         [],
    }
    if (!transitions[prev.status]?.includes(input.status)) {
      throw Object.assign(
        new Error(`Invalid transition: ${prev.status} → ${input.status}`),
        { status: 400 },
      )
    }

    // Append update audit entry
    const updated = await prisma.auditLog.create({
      data: {
        branchId,
        userId:     updatedById,
        action:     'UPDATE',
        entityType: 'InsuranceClaim',
        entityId:   claimNo,
        oldValue:   { status: prev.status } as any,
        newValue:   {
          ...prev,
          status:          input.status,
          approvedAmount:  input.approvedAmount,
          rejectionReason: input.rejectionReason,
          paymentRef:      input.paymentRef,
          paidAt:          input.paidAt,
          updatedAt:       new Date().toISOString(),
        } as any,
      },
    })

    await redis.del(`insurance:stats:${branchId}`)
    return updated
  }

  async search(input: ClaimSearchInput, branchId: string) {
    const { insurer, status, from, to, page, limit } = input
    const skip = (page - 1) * limit

    const where: any = {
      branchId,
      entityType: 'InsuranceClaim',
      action:     'CREATE',
    }

    // Filter on jsonb fields
    const conditions: string[] = []
    if (insurer) conditions.push(`(new_value->>'insurer') = '${insurer}'`)
    if (status)  conditions.push(`(new_value->>'status')  = '${status}'`)
    if (from)    conditions.push(`(new_value->>'createdAt') >= '${from}'`)
    if (to)      conditions.push(`(new_value->>'createdAt') <= '${to}T23:59:59'`)

    // Base query using prisma for type safety + raw for jsonb filter
    const claims = await prisma.$queryRaw<any[]>`
      SELECT
        entity_id                   AS claim_no,
        new_value->>'patientName'   AS patient_name,
        new_value->>'insurer'       AS insurer,
        new_value->>'drugDispensed' AS drug_dispensed,
        new_value->>'claimValue'    AS claim_value,
        new_value->>'status'        AS status,
        new_value->>'rxNumber'      AS rx_number,
        new_value->>'createdAt'     AS created_at,
        new_value->>'policyNo'      AS policy_no
      FROM audit_logs
      WHERE branch_id   = ${branchId}
        AND entity_type = 'InsuranceClaim'
        AND action      = 'CREATE'
        ${insurer ? Prisma.sql`AND new_value->>'insurer' = ${insurer}` : Prisma.empty}
        ${status  ? Prisma.sql`AND new_value->>'status'  = ${status}`  : Prisma.empty}
      ORDER BY created_at DESC
      LIMIT  ${limit}
      OFFSET ${skip}
    `

    return { data: claims, meta: { page, limit } }
  }

  async getStats(branchId: string) {
    const cacheKey = `insurance:stats:${branchId}`
    const cached   = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const result = await prisma.$queryRaw<{
      status: string
      count:  number
      total:  number
    }[]>`
      SELECT
        new_value->>'status'               AS status,
        COUNT(*)::int                      AS count,
        SUM((new_value->>'claimValue')::numeric)::numeric AS total
      FROM audit_logs
      WHERE branch_id   = ${branchId}
        AND entity_type = 'InsuranceClaim'
        AND action      = 'CREATE'
      GROUP BY new_value->>'status'
    `

    const stats = {
      byStatus:    result,
      total:       result.reduce((s, r) => s + r.count, 0),
      totalValue:  result.reduce((s, r) => s + Number(r.total ?? 0), 0),
      outstanding: result
        .filter(r => ['PENDING','RESUBMITTED'].includes(r.status))
        .reduce((s, r) => s + Number(r.total ?? 0), 0),
    }

    await redis.setex(cacheKey, 120, JSON.stringify(stats))
    return stats
  }

  async resubmit(claimNo: string, branchId: string, userId: string) {
    return this.updateClaimStatus(
      claimNo,
      { status: 'RESUBMITTED' },
      branchId,
      userId,
    )
  }
}

export const insuranceService = new InsuranceService()

// Expose Prisma for raw query reference
import { Prisma } from '@prisma/client'
