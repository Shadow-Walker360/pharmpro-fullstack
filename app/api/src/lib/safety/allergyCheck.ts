// ════════════════════════════════════════════════════════════
// lib/safety/allergyCheck.ts
// Checks if any drug in the prescription matches a known
// patient allergy or a drug class the patient reacts to.
// ════════════════════════════════════════════════════════════

import { prisma }          from '../../config/prisma'
import type { SafetyWarning } from './types'

// Known cross-reactivity map — drug class → related allergens
// e.g. Amoxicillin belongs to Penicillins; a penicillin-allergic
// patient should be warned even if "Amoxicillin" isn't listed.
const CROSS_REACTIVITY: Record<string, string[]> = {
  'Penicillin':       ['Amoxicillin','Ampicillin','Flucloxacillin','Co-amoxiclav','Piperacillin'],
  'Sulfonamides':     ['Sulfamethoxazole','Co-trimoxazole','Trimethoprim-Sulfa'],
  'Cephalosporins':   ['Cefalexin','Cefuroxime','Ceftriaxone','Cefixime'],
  'NSAIDs':           ['Ibuprofen','Diclofenac','Aspirin','Naproxen','Indomethacin'],
  'Macrolides':       ['Azithromycin','Clarithromycin','Erythromycin'],
  'Fluoroquinolones': ['Ciprofloxacin','Levofloxacin','Norfloxacin'],
  'Statins':          ['Atorvastatin','Simvastatin','Rosuvastatin','Lovastatin'],
}

function isDrugRelatedToAllergen(drugName: string, allergen: string): boolean {
  const dn = drugName.toLowerCase()
  const al = allergen.toLowerCase()

  // Direct match
  if (dn.includes(al) || al.includes(dn)) return true

  // Cross-reactivity check
  for (const [classAllergen, drugs] of Object.entries(CROSS_REACTIVITY)) {
    if (al.includes(classAllergen.toLowerCase())) {
      if (drugs.some(d => dn.includes(d.toLowerCase()))) return true
    }
  }

  return false
}

export async function runAllergyCheck(
  patientId: string,
  drugIds:   string[],
): Promise<SafetyWarning[]> {
  const warnings: SafetyWarning[] = []

  const [allergies, drugs] = await Promise.all([
    prisma.allergy.findMany({
      where: { patientId, isActive: true, allergenType: { in: ['DRUG'] } },
    }),
    prisma.drug.findMany({
      where: { id: { in: drugIds } },
      select: { id: true, brandName: true, genericName: true, drugClass: true },
    }),
  ])

  if (!allergies.length) return []

  for (const drug of drugs) {
    for (const allergy of allergies) {
      const related = isDrugRelatedToAllergen(drug.genericName, allergy.allergen)
                   || isDrugRelatedToAllergen(drug.brandName,   allergy.allergen)
                   || (drug.drugClass
                        ? isDrugRelatedToAllergen(drug.drugClass, allergy.allergen)
                        : false)

      if (related) {
        const sevMap: Record<string, WarningSeverity> = {
          MILD:              'WARNING',
          MODERATE:          'WARNING',
          SEVERE:            'MAJOR',
          LIFE_THREATENING:  'CONTRAINDICATED',
          UNKNOWN:           'WARNING',
        }
        const sev = sevMap[allergy.severity] ?? 'WARNING'

        warnings.push({
          type:    'ALLERGY',
          severity: sev,
          title:   `Allergy alert — ${drug.genericName}`,
          message: `Patient has a documented ${allergy.severity.toLowerCase()} allergy to ${allergy.allergen}.`
                 + (allergy.reaction ? ` Known reaction: ${allergy.reaction}.` : ''),
          requiresOverride: ['MAJOR','CONTRAINDICATED'].includes(sev),
          meta: {
            drugId:       drug.id,
            drugName:     drug.genericName,
            allergen:     allergy.allergen,
            allergenId:   allergy.id,
            severity:     allergy.severity,
            reaction:     allergy.reaction,
          },
        })
      }
    }
  }

  return warnings
}


