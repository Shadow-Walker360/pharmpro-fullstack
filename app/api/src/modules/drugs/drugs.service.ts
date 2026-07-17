// ════════════════════════════════════════════════════════════
// modules/drugs/drugs.service.ts
// ════════════════════════════════════════════════════════════

import { prisma }  from '../../config/prisma'
import { logger }  from '../../lib/logger'
import type {
  CreateDrugInput,
  UpdateDrugInput,
  DrugSearchInput,
  AddInteractionInput,
} from './drugs.schema'

export class DrugsService {

  // ── Create drug ───────────────────────────────────────
  async create(input: CreateDrugInput, createdById: string) {
    const drug = await prisma.drug.create({
      data: {
        ...input,
        controlledCategory: input.controlledCategory as any,
        pregnancyCategory:  input.pregnancyCategory,
      },
    })

    await prisma.auditLog.create({
      data: {
        branchId:   'system', // drugs are global, not branch-scoped
        userId:     createdById,
        action:     'CREATE',
        entityType: 'Drug',
        entityId:   drug.id,
        newValue:   { brandName: drug.brandName, genericName: drug.genericName },
      },
    })

    logger.info({ drugId: drug.id, genericName: drug.genericName }, 'Drug added to database')
    return drug
  }

  // ── Search drugs ──────────────────────────────────────
  async search(input: DrugSearchInput) {
    const { q, page, limit } = input
    const skip = (page - 1) * limit

    const where: any = {
      isActive:  true,
      deletedAt: null,
      ...(input.class && { drugClass: { contains: input.class, mode: 'insensitive' } }),
      ...(input.form  && { dosageForm:{ contains: input.form,  mode: 'insensitive' } }),
      ...(input.controlled !== undefined && {
        controlledCategory: input.controlled
          ? { in: ['SCHEDULE_I','SCHEDULE_II','SCHEDULE_III'] }
          : { in: ['OTC','PRESCRIPTION_ONLY','RESTRICTED'] },
      }),
    }

    if (q) {
      where.OR = [
        { brandName:   { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
        { drugClass:   { contains: q, mode: 'insensitive' } },
      ]
    }

    const [drugs, total] = await prisma.$transaction([
      prisma.drug.findMany({
        where,
        skip,
        take: limit,
        orderBy: { genericName: 'asc' },
        include: {
          _count: {
            select: { inventory: true, prescriptionItems: true },
          },
        },
      }),
      prisma.drug.count({ where }),
    ])

    return {
      data: drugs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  }

  // ── Get single drug with full detail ──────────────────
  async findById(drugId: string) {
    const drug = await prisma.drug.findFirst({
      where:   { id: drugId, deletedAt: null },
      include: {
        interactionsAsA: {
          where:   { isActive: true },
          include: { drugB: { select: { genericName: true, brandName: true } } },
        },
        interactionsAsB: {
          where:   { isActive: true },
          include: { drugA: { select: { genericName: true, brandName: true } } },
        },
        medicationBatches: {
          where:   { isRecalled: false },
          orderBy: { expiryDate: 'asc' },
        },
      },
    })
    if (!drug) throw Object.assign(new Error('Drug not found'), { status: 404 })

    // Merge interactions from both sides of the relation
    const interactions = [
      ...drug.interactionsAsA.map(ix => ({
        withDrug:    ix.drugB.genericName,
        severity:    ix.severity,
        description: ix.description,
        mechanism:   ix.mechanism,
        source:      ix.source,
      })),
      ...drug.interactionsAsB.map(ix => ({
        withDrug:    ix.drugA.genericName,
        severity:    ix.severity,
        description: ix.description,
        mechanism:   ix.mechanism,
        source:      ix.source,
      })),
    ]

    return { ...drug, interactions }
  }

  // ── Update drug ───────────────────────────────────────
  async update(drugId: string, input: UpdateDrugInput, updatedById: string) {
    const existing = await prisma.drug.findFirst({ where: { id: drugId, deletedAt: null } })
    if (!existing) throw Object.assign(new Error('Drug not found'), { status: 404 })

    const updated = await prisma.drug.update({
      where: { id: drugId },
      data:  {
        ...input,
        controlledCategory: input.controlledCategory as any,
      },
    })

    await prisma.auditLog.create({
      data: {
        branchId:   'system',
        userId:     updatedById,
        action:     'UPDATE',
        entityType: 'Drug',
        entityId:   drugId,
        oldValue:   existing as any,
        newValue:   updated  as any,
      },
    })

    return updated
  }

  // ── Soft delete drug ──────────────────────────────────
  async softDelete(drugId: string, deletedById: string) {
    const drug = await prisma.drug.findFirst({ where: { id: drugId, deletedAt: null } })
    if (!drug) throw Object.assign(new Error('Drug not found'), { status: 404 })

    return prisma.drug.update({
      where: { id: drugId },
      data:  { deletedAt: new Date(), isActive: false },
    })
  }

  // ── Check interaction between two specific drugs ──────
  async checkInteraction(drugAId: string, drugBId: string) {
    const interaction = await prisma.drugInteraction.findFirst({
      where: {
        isActive: true,
        OR: [
          { drugAId, drugBId },
          { drugAId: drugBId, drugBId: drugAId },
        ],
      },
      include: {
        drugA: { select: { genericName: true } },
        drugB: { select: { genericName: true } },
      },
    })

    if (!interaction) {
      return { found: false, message: 'No known interaction found in database. Always verify with current clinical references.' }
    }

    return {
      found:       true,
      severity:    interaction.severity,
      description: interaction.description,
      mechanism:   interaction.mechanism,
      source:      interaction.source,
      drugA:       interaction.drugA.genericName,
      drugB:       interaction.drugB.genericName,
    }
  }

  // ── Add interaction ───────────────────────────────────
  async addInteraction(input: AddInteractionInput, createdById: string) {
    const existing = await prisma.drugInteraction.findFirst({
      where: {
        OR: [
          { drugAId: input.drugAId, drugBId: input.drugBId },
          { drugAId: input.drugBId, drugBId: input.drugAId },
        ],
      },
    })
    if (existing) throw Object.assign(new Error('Interaction already recorded'), { status: 409 })

    const ix = await prisma.drugInteraction.create({
      data: {
        drugAId:     input.drugAId,
        drugBId:     input.drugBId,
        severity:    input.severity as any,
        description: input.description,
        mechanism:   input.mechanism,
        source:      input.source,
      },
    })

    await prisma.auditLog.create({
      data: {
        branchId:   'system',
        userId:     createdById,
        action:     'CREATE',
        entityType: 'DrugInteraction',
        entityId:   ix.id,
        newValue:   input as any,
      },
    })

    return ix
  }

  // ── Batch recall ──────────────────────────────────────
  // Mark a batch as recalled and return all affected patients
  async recallBatch(batchId: string, reason: string, recalledById: string) {
    const batch = await prisma.medicationBatch.findUnique({ where: { id: batchId } })
    if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 })

    await prisma.medicationBatch.update({
      where: { id: batchId },
      data:  { isRecalled: true, recallReason: reason, recalledAt: new Date() },
    })

    // Find all patients who received this batch
    const affectedItems = await prisma.prescriptionItem.findMany({
      where:   { batchId },
      include: { prescription: { include: { patient: true } } },
      distinct: ['prescriptionId'],
    })

    const affectedPatients = affectedItems.map(i => ({
      patientId:  i.prescription.patient.id,
      name:       `${i.prescription.patient.firstName} ${i.prescription.patient.lastName}`,
      phone:      i.prescription.patient.phone,
      rxNumber:   i.prescription.rxNumber,
    }))

    await prisma.auditLog.create({
      data: {
        branchId:   'system',
        userId:     recalledById,
        action:     'UPDATE',
        entityType: 'MedicationBatch',
        entityId:   batchId,
        newValue:   { isRecalled: true, reason, affectedCount: affectedPatients.length } as any,
      },
    })

    logger.warn(
      { batchId, reason, affectedCount: affectedPatients.length },
      '⚠️  Batch recalled',
    )

    return { batch: { ...batch, isRecalled: true, recallReason: reason }, affectedPatients }
  }
}

export const drugsService = new DrugsService()


