// ════════════════════════════════════════════════════════════
// lib/safety/types.ts
// Shared types for the safety check engine
// ════════════════════════════════════════════════════════════

export type WarningSeverity = 'INFO' | 'WARNING' | 'MAJOR' | 'CONTRAINDICATED'

export interface SafetyWarning {
  type:        'ALLERGY' | 'INTERACTION' | 'PREGNANCY' | 'CONTROLLED' | 'DUPLICATE'
  severity:    WarningSeverity
  title:       string
  message:     string
  requiresOverride: boolean   // if true, pharmacist must explicitly acknowledge
  meta?:       Record<string, unknown>
}

export interface SafetyCheckResult {
  safe:        boolean        // false = at least one CONTRAINDICATED warning
  warnings:    SafetyWarning[]
  // safe=false must NOT block dispense — it must force an override acknowledgment.
  // The clinician always decides. The system always warns.
}


