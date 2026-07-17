// ════════════════════════════════════════════════════════════
// lib/safety/controlledCheck.ts
// Flags controlled substances and enforces extra logging.
// ════════════════════════════════════════════════════════════

import { prisma }             from '../../config/prisma'
import type { SafetyWarning } from './types'

export async function runControlledCheck(drugIds: string[]): Promise<SafetyWarning[]> {
  const warnings: SafetyWarning[] = []

  const controlled = await prisma.drug.findMany({
    where: {
      id:                 { in: drugIds },
      controlledCategory: { in: ['SCHEDULE_I','SCHEDULE_II','SCHEDULE_III'] },
    },
    select: { id: true, genericName: true, controlledCategory: true },
  })

  for (const drug of controlled) {
    warnings.push({
      type:     'CONTROLLED',
      severity: drug.controlledCategory === 'SCHEDULE_I' ? 'CONTRAINDICATED' : 'MAJOR',
      title:    `Controlled substance — ${drug.genericName} (${drug.controlledCategory})`,
      message:  `${drug.genericName} is a ${drug.controlledCategory.replace('_',' ')} controlled substance.`
              + ' Ensure prescription is valid, verify prescriber license, and log in controlled substance register.',
      requiresOverride: true,
      meta: {
        drugId:   drug.id,
        drugName: drug.genericName,
        schedule: drug.controlledCategory,
      },
    })
  }

  return warnings
}


