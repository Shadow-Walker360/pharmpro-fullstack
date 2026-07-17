// ════════════════════════════════════════════════════════════
// lib/safety/pregnancyCheck.ts
// Checks pregnancy category of each drug against patient status.
// ════════════════════════════════════════════════════════════

import { prisma }             from '../../config/prisma'
import type { SafetyWarning } from './types'

// FDA Pregnancy categories and their risk levels
const PREGNANCY_RISK: Record<string, { severity: WarningSeverity; label: string }> = {
  A: { severity: 'INFO',             label: 'Adequate studies show no fetal risk' },
  B: { severity: 'INFO',             label: 'Animal studies show no risk; no adequate human studies' },
  C: { severity: 'WARNING',          label: 'Animal studies show adverse effects; potential benefit may outweigh risk' },
  D: { severity: 'MAJOR',            label: 'Evidence of human fetal risk; benefits may outweigh risk' },
  X: { severity: 'CONTRAINDICATED',  label: 'Studies show fetal abnormalities; risks outweigh benefits. DO NOT USE.' },
}

export async function runPregnancyCheck(
  patientId: string,
  drugIds:   string[],
): Promise<SafetyWarning[]> {
  const warnings: SafetyWarning[] = []

  const patient = await prisma.patient.findUnique({
    where:  { id: patientId },
    select: { pregnancyStatus: true, isBreastfeeding: true },
  })

  if (!patient) return []

  const isPregnant      = patient.pregnancyStatus === 'PREGNANT'
  const isBreastfeeding = patient.isBreastfeeding || patient.pregnancyStatus === 'BREASTFEEDING'

  if (!isPregnant && !isBreastfeeding) return []

  const drugs = await prisma.drug.findMany({
    where:  { id: { in: drugIds } },
    select: { id: true, genericName: true, pregnancyCategory: true },
  })

  for (const drug of drugs) {
    const cat = drug.pregnancyCategory?.toUpperCase()

    if (isPregnant && cat) {
      const risk = PREGNANCY_RISK[cat]
      if (risk && ['C','D','X'].includes(cat)) {
        warnings.push({
          type:     'PREGNANCY',
          severity: risk.severity,
          title:    `Pregnancy risk — ${drug.genericName} (Category ${cat})`,
          message:  `Patient is pregnant. ${drug.genericName} is Pregnancy Category ${cat}. ${risk.label}.`,
          requiresOverride: ['D','X'].includes(cat),
          meta: { drugId: drug.id, drugName: drug.genericName, pregnancyCategory: cat },
        })
      }
    }

    if (isBreastfeeding) {
      // Category X and D drugs are also flagged for breastfeeding
      if (cat && ['D','X'].includes(cat)) {
        warnings.push({
          type:     'PREGNANCY',
          severity: 'WARNING',
          title:    `Breastfeeding caution — ${drug.genericName}`,
          message:  `Patient is breastfeeding. Verify safety of ${drug.genericName} during lactation.`,
          requiresOverride: false,
          meta: { drugId: drug.id, drugName: drug.genericName },
        })
      }
    }
  }

  return warnings
}


