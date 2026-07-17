import { prisma } from '../../config/prisma';
import { writeAuditLog } from '../../lib/audit';
import { ApiError } from '../../lib/errors';
import type { Prisma } from '@prisma/client';
import type { CreatePatientInput, UpdatePatientInput, AddAllergyInput, PatientQueryInput } from './patients.schema';

export async function createPatient(branchId: string, userId: string, ipAddress: string, input: CreatePatientInput) {
  // Duplicate check only against whichever identifiers were actually provided —
  // can't dedupe on a field that's optional and might be null for both records.
  if (input.phone) {
    const existing = await prisma.patient.findFirst({ where: { branchId, phone: input.phone, deletedAt: null } });
    if (existing) throw ApiError.conflict('A patient with this phone number already exists');
  }
  if (input.nationalId) {
    const existing = await prisma.patient.findFirst({ where: { branchId, nationalId: input.nationalId, deletedAt: null } });
    if (existing) throw ApiError.conflict('A patient with this national ID already exists');
  }

  const patient = await prisma.patient.create({
    data: { branchId, ...input, dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined },
  });

  await writeAuditLog({
    userId, branchId, action: 'CREATE', tableName: 'patient', recordId: patient.id,
    newValue: { fullName: patient.fullName }, ipAddress,
  });

  return patient;
}

export async function listPatients(branchId: string, query: PatientQueryInput) {
  const where: Prisma.PatientWhereInput = {
    branchId,
    deletedAt: null,
    ...(query.q && {
      OR: [
        { fullName: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q } },
        { email: { contains: query.q, mode: 'insensitive' } },
        { nationalId: { contains: query.q } },
      ],
    }),
    ...(query.hasChronicCondition !== undefined && {
      chronicConditions: query.hasChronicCondition ? { isEmpty: false } : { isEmpty: true },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      select: {
        id: true, fullName: true, phone: true, email: true, dateOfBirth: true,
        chronicConditions: true, isPregnant: true, createdAt: true,
      },
      orderBy: { fullName: 'asc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.patient.count({ where }),
  ]);

  return { data, total, pages: Math.ceil(total / query.limit) };
}

/**
 * Fetches full patient detail. Read-audit logging happens in the
 * readLogger middleware wrapping this route, not here — keeps the service
 * focused on data access, not cross-cutting compliance concerns.
 */
export async function getPatientOrThrow(patientId: string, branchId: string) {
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, branchId, deletedAt: null },
    include: {
      allergies: true,
      prescriptions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, prescriptionNumber: true, status: true, createdAt: true },
      },
    },
  });
  if (!patient) throw ApiError.notFound('Patient not found');
  return patient;
}

export async function updatePatient(patientId: string, branchId: string, userId: string, ipAddress: string, input: UpdatePatientInput) {
  const existing = await prisma.patient.findFirst({ where: { id: patientId, branchId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Patient not found');

  const updated = await prisma.patient.update({
    where: { id: patientId },
    data: { ...input, dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined },
  });

  await writeAuditLog({
    userId, branchId, action: 'UPDATE', tableName: 'patient', recordId: patientId,
    oldValue: existing, newValue: updated, ipAddress,
  });

  return updated;
}

export async function addAllergy(patientId: string, branchId: string, userId: string, ipAddress: string, input: AddAllergyInput) {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, branchId, deletedAt: null } });
  if (!patient) throw ApiError.notFound('Patient not found');

  const allergy = await prisma.allergy.create({
    data: { patientId, allergen: input.allergen, type: input.type, severity: input.severity, reaction: input.reaction },
  });

  // Allergy additions are safety-critical — always audited regardless of
  // whether the generic auditLogger middleware is also attached to this route.
  await writeAuditLog({
    userId, branchId, action: 'CREATE', tableName: 'allergy', recordId: allergy.id,
    newValue: { patientId, allergen: input.allergen, severity: input.severity }, ipAddress,
  });

  return allergy;
}

export async function deletePatient(patientId: string, branchId: string, userId: string, ipAddress: string) {
  const existing = await prisma.patient.findFirst({ where: { id: patientId, branchId, deletedAt: null } });
  if (!existing) throw ApiError.notFound('Patient not found');

  // Soft delete only — patient records with prescription/dispensing history
  // are regulatory records, never hard-deleted.
  await prisma.patient.update({ where: { id: patientId }, data: { deletedAt: new Date() } });

  await writeAuditLog({
    userId, branchId, action: 'DELETE', tableName: 'patient', recordId: patientId, ipAddress,
  });
}

/**
 * Patients with a prescription past its nextEligibleAt refill date who
 * haven't come back — used by the dashboard's "refill due" alert and by
 * the BullMQ reminder job (Step 5's prescriptions.jobs.ts).
 *
 * Uses raw SQL because comparing two columns (refillsUsed < refillsAllowed)
 * isn't expressible through Prisma's client API — the fields-comparison
 * filter Prisma docs mention only works within the SAME model in newer
 * versions, and here it spans PrescriptionRefill, not Patient.
 */
export async function getPatientsWithOverdueRefills(branchId: string) {
  return prisma.$queryRaw<Array<{ id: string; fullName: string; phone: string | null }>>`
    SELECT DISTINCT p.id, p."fullName", p.phone
    FROM "Patient" p
    JOIN "Prescription" pr ON pr."patientId" = p.id
    JOIN "PrescriptionRefill" pref ON pref."prescriptionId" = pr.id
    WHERE p."branchId" = ${branchId}
      AND p."deletedAt" IS NULL
      AND pref."nextEligibleAt" <= NOW()
      AND pref."refillsUsed" < pref."refillsAllowed"
  `;
}

// ════════════════════════════════════════════════════════════
// modules/patients/patients.service.ts
// ════════════════════════════════════════════════════════════

import { prisma }   from '../../config/prisma'
import { logger }   from '../../lib/logger'
import type {
  CreatePatientInput,
  UpdatePatientInput,
  CreateAllergyInput,
  PatientSearchInput,
} from './patients.schema'

export class PatientsService {

  // ── Create patient ────────────────────────────────────
  async create(input: CreatePatientInput, branchId: string, createdById: string) {
    const patient = await prisma.patient.create({
      data: {
        branchId,
        firstName:         input.firstName,
        lastName:          input.lastName,
        nickname:          input.nickname,
        phone:             input.phone,
        altPhone:          input.altPhone,
        email:             input.email,
        dateOfBirth:       input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender:            input.gender,
        bloodGroup:        input.bloodGroup,
        nationalId:        input.nationalId,
        nhifNo:            input.nhifNo,
        passportNo:        input.passportNo,
        birthCertNo:       input.birthCertNo,
        insurance:         input.insurance,
        policyNo:          input.policyNo,
        insuranceExpiry:   input.insuranceExpiry ? new Date(input.insuranceExpiry) : null,
        pregnancyStatus:   input.pregnancyStatus as any,
        isBreastfeeding:   input.isBreastfeeding,
        chronicConditions: input.chronicConditions,
        currentMedications:input.currentMedications,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        branchId,
        userId:     createdById,
        action:     'CREATE',
        entityType: 'Patient',
        entityId:   patient.id,
        newValue:   { firstName: patient.firstName, lastName: patient.lastName },
      },
    })

    logger.info({ branchId, patientId: patient.id }, 'Patient registered')
    return patient
  }

  // ── Search patients ───────────────────────────────────
  // Africa-first search: works with partial name, phone, NHIF,
  // national ID, or birth cert number.
  async search(input: PatientSearchInput, branchId: string) {
    const { q, condition, insurance, page, limit } = input
    const skip = (page - 1) * limit

    const where: any = {
      branchId,
      deletedAt: null,
      ...(condition && {
        chronicConditions: { has: condition },
      }),
      ...(insurance && { insurance }),
    }

    // Flexible search across multiple identifier fields
    if (q) {
      where.OR = [
        { firstName:  { contains: q, mode: 'insensitive' } },
        { lastName:   { contains: q, mode: 'insensitive' } },
        { nickname:   { contains: q, mode: 'insensitive' } },
        { phone:      { contains: q } },
        { altPhone:   { contains: q } },
        { nhifNo:     { contains: q, mode: 'insensitive' } },
        { nationalId: { contains: q, mode: 'insensitive' } },
        { passportNo: { contains: q, mode: 'insensitive' } },
        { birthCertNo:{ contains: q, mode: 'insensitive' } },
        // Allow "Mary Wanjiku" or "Wanjiku Mary" search
        {
          AND: [
            { firstName: { contains: q.split(' ')[0], mode: 'insensitive' } },
            { lastName:  { contains: q.split(' ').slice(1).join(' ') || q, mode: 'insensitive' } },
          ],
        },
      ]
    }

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          allergies: {
            where:   { isActive: true },
            select:  { allergen: true, severity: true, allergenType: true },
          },
          _count: {
            select: { prescriptions: true, clinicalNotes: true },
          },
        },
      }),
      prisma.patient.count({ where }),
    ])

    return {
      data: patients,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  }

  // ── Get single patient (full profile) ─────────────────
  async findById(patientId: string, branchId: string, requestedById: string) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
      include: {
        allergies:     { where: { isActive: true } },
        prescriptions: {
          where:   { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take:    10,
          include: { items: { include: { drug: true } } },
        },
        clinicalNotes: {
          orderBy: { createdAt: 'desc' },
          take:    20,
          include: { createdBy: { select: { firstName: true, lastName: true, role: true } } },
        },
        sales: {
          orderBy: { createdAt: 'desc' },
          take:    10,
          select:  { id: true, saleNo: true, total: true, createdAt: true, status: true },
        },
      },
    })

    if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 })

    // Log the view — healthcare privacy requirement
    await prisma.readAuditLog.create({
      data: {
        branchId,
        userId:     requestedById,
        patientId:  patient.id,
        recordType: 'full_profile',
      },
    })

    return patient
  }

  // ── Update patient ────────────────────────────────────
  async update(
    patientId: string,
    input: UpdatePatientInput,
    branchId: string,
    updatedById: string,
  ) {
    const existing = await prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
    })
    if (!existing) throw Object.assign(new Error('Patient not found'), { status: 404 })

    const updated = await prisma.patient.update({
      where: { id: patientId },
      data: {
        ...input,
        dateOfBirth:     input.dateOfBirth     ? new Date(input.dateOfBirth)     : undefined,
        insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) : undefined,
        pregnancyStatus: input.pregnancyStatus as any,
      },
    })

    await prisma.auditLog.create({
      data: {
        branchId,
        userId:     updatedById,
        action:     'UPDATE',
        entityType: 'Patient',
        entityId:   patientId,
        oldValue:   existing as any,
        newValue:   updated  as any,
      },
    })

    return updated
  }

  // ── Soft delete ───────────────────────────────────────
  async softDelete(patientId: string, branchId: string, deletedById: string) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
    })
    if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 })

    await prisma.patient.update({
      where: { id: patientId },
      data:  { deletedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        branchId,
        userId:     deletedById,
        action:     'DELETE',
        entityType: 'Patient',
        entityId:   patientId,
        oldValue:   { firstName: patient.firstName, lastName: patient.lastName },
      },
    })
  }

  // ── Add allergy ───────────────────────────────────────
  async addAllergy(
    patientId: string,
    input: CreateAllergyInput,
    branchId: string,
    addedById: string,
  ) {
    // Confirm patient belongs to branch
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
    })
    if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 })

    const allergy = await prisma.allergy.create({
      data: {
        patientId,
        allergen:     input.allergen,
        allergenType: input.allergenType as any,
        severity:     input.severity     as any,
        reaction:     input.reaction,
        notes:        input.notes,
        verifiedById: addedById,
        verifiedAt:   new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        branchId,
        userId:     addedById,
        action:     'CREATE',
        entityType: 'Allergy',
        entityId:   allergy.id,
        newValue:   { patientId, allergen: input.allergen, severity: input.severity },
      },
    })

    logger.warn(
      { patientId, allergen: input.allergen, severity: input.severity },
      'Allergy recorded on patient',
    )

    return allergy
  }

  // ── Get allergies ─────────────────────────────────────
  async getAllergies(patientId: string, branchId: string) {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, branchId, deletedAt: null },
    })
    if (!patient) throw Object.assign(new Error('Patient not found'), { status: 404 })

    return prisma.allergy.findMany({
      where:   { patientId, isActive: true },
      orderBy: { severity: 'desc' },
    })
  }

  // ── Patients due for refill ───────────────────────────
  async getRefillsDue(branchId: string) {
    return prisma.patient.findMany({
      where: {
        branchId,
        deletedAt: null,
        chronicConditions: { isEmpty: false },
        prescriptions: {
          some: {
            status:    'DISPENSED',
            deletedAt: null,
            refills: {
              some: {
                nextEligibleAt: { lte: new Date() },
              },
            },
          },
        },
      },
      include: {
        prescriptions: {
          where: { status: 'DISPENSED', deletedAt: null },
          include: {
            items:   { include: { drug: true } },
            refills: { orderBy: { dispensedAt: 'desc' }, take: 1 },
          },
        },
      },
      take: 50,
    })
  }

  // ── Stats for dashboard ───────────────────────────────
  async getStats(branchId: string) {
    const [total, activeThisMonth, chronic, refillsDue] = await prisma.$transaction([
      prisma.patient.count({ where: { branchId, deletedAt: null } }),
      prisma.patient.count({
        where: {
          branchId,
          deletedAt: null,
          sales: { some: { createdAt: { gte: new Date(new Date().setDate(1)) } } },
        },
      }),
      prisma.patient.count({
        where: {
          branchId,
          deletedAt: null,
          chronicConditions: { isEmpty: false },
        },
      }),
      prisma.patient.count({
        where: {
          branchId,
          deletedAt: null,
          prescriptions: {
            some: {
              status:    'DISPENSED',
              deletedAt: null,
              refills:   { some: { nextEligibleAt: { lte: new Date() } } },
            },
          },
        },
      }),
    ])

    return { total, activeThisMonth, chronic, refillsDue }
  }
}

export const patientsService = new PatientsService()


