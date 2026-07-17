// ════════════════════════════════════════════════════════════
// lib/safety/safetyEngine.ts
// Orchestrates all checks and returns a unified result.
// Called before EVERY prescription dispense attempt.
// ════════════════════════════════════════════════════════════

import { runAllergyCheck }     from './allergyCheck'
import { runInteractionCheck } from './interactionCheck'
import { runPregnancyCheck }   from './pregnancyCheck'
import { runControlledCheck }  from './controlledCheck'
import type { SafetyCheckResult, WarningSeverity } from './types'
import { logger }              from '../logger'

const SEVERITY_ORDER: WarningSeverity[] = ['INFO','WARNING','MAJOR','CONTRAINDICATED']

export async function runSafetyChecks(params: {
  patientId:           string
  drugIds:             string[]
  currentMedications:  string[]
}): Promise<SafetyCheckResult> {
  const { patientId, drugIds, currentMedications } = params

  // Run all checks in parallel for speed
  const [allergyWarnings, interactionWarnings, pregnancyWarnings, controlledWarnings] =
    await Promise.all([
      runAllergyCheck(patientId, drugIds),
      runInteractionCheck(drugIds, currentMedications),
      runPregnancyCheck(patientId, drugIds),
      runControlledCheck(drugIds),
    ])

  const all = [
    ...allergyWarnings,
    ...interactionWarnings,
    ...pregnancyWarnings,
    ...controlledWarnings,
  ]

  // Sort by severity descending (most severe first)
  all.sort((a, b) =>
    SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity),
  )

  // System is NOT safe if any CONTRAINDICATED warning exists
  const safe = !all.some(w => w.severity === 'CONTRAINDICATED')

  if (!safe) {
    logger.warn({ patientId, drugIds, warnings: all.length }, 'Safety check failed — contraindicated combination')
  } else if (all.length > 0) {
    logger.info({ patientId, drugIds, warnings: all.length }, 'Safety check passed with warnings')
  }

  return { safe, warnings: all }
}

export type { SafetyCheckResult, SafetyWarning } from './types'