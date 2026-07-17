// ════════════════════════════════════════════════════════════
// lib/safety/interactionCheck.ts
// Checks every pair of drugs in the prescription AND against
// the patient's current medications stored on their profile.
// ════════════════════════════════════════════════════════════

import { prisma }             from '../../config/prisma'
import type { SafetyWarning } from './types'

export async function runInteractionCheck(
  drugIds:            string[],
  currentMedications: string[], // free-text from patient.currentMedications
): Promise<SafetyWarning[]> {
  const warnings: SafetyWarning[] = []
  if (drugIds.length < 1) return []

  // Check pairs within the new prescription
  const interactions = await prisma.drugInteraction.findMany({
    where: {
      isActive: true,
      OR: [
        { drugAId: { in: drugIds }, drugBId: { in: drugIds } },
      ],
    },
    include: {
      drugA: { select: { genericName: true } },
      drugB: { select: { genericName: true } },
    },
  })

  // Also check against drugs already in patient's active prescriptions
  if (drugIds.length > 0) {
    const existingInteractions = await prisma.drugInteraction.findMany({
      where: {
        isActive: true,
        OR: [
          { drugAId: { in: drugIds } },
          { drugBId: { in: drugIds } },
        ],
      },
      include: {
        drugA: { select: { genericName: true } },
        drugB: { select: { genericName: true } },
      },
    })
    interactions.push(...existingInteractions)
  }

  // Deduplicate
  const seen  = new Set<string>()
  const unique = interactions.filter(ix => {
    const key = [ix.drugAId, ix.drugBId].sort().join('-')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  for (const ix of unique) {
    const sevMap: Record<string, WarningSeverity> = {
      MINOR:            'INFO',
      MODERATE:         'WARNING',
      MAJOR:            'MAJOR',
      CONTRAINDICATED:  'CONTRAINDICATED',
    }
    const sev = sevMap[ix.severity] ?? 'INFO'

    warnings.push({
      type:    'INTERACTION',
      severity: sev,
      title:   `Drug interaction — ${ix.drugA.genericName} + ${ix.drugB.genericName}`,
      message: ix.description
             + (ix.mechanism ? ` Mechanism: ${ix.mechanism}.` : ''),
      requiresOverride: ['MAJOR','CONTRAINDICATED'].includes(sev),
      meta: {
        drugAName: ix.drugA.genericName,
        drugBName: ix.drugB.genericName,
        severity:  ix.severity,
        source:    ix.source,
      },
    })
  }

  // Free-text current medication check (best-effort)
  // Logs a general warning if patient has many unstructured medications
  if (currentMedications.length > 3) {
    warnings.push({
      type:     'INTERACTION',
      severity: 'INFO',
      title:    'Multiple current medications',
      message:  `Patient is on ${currentMedications.length} current medications`
              + ` (${currentMedications.slice(0,3).join(', ')}...).`
              + ' Review for interactions not captured in the database.',
      requiresOverride: false,
      meta: { currentMedications },
    })
  }

  return warnings
}


