// ════════════════════════════════════════════════════════════
// modules/patients/patients.schema.ts
// Africa-first: only firstName + lastName are required.
// Everything else is optional — phone, email, ID, insurance.
// ════════════════════════════════════════════════════════════

import { z } from 'zod'

export const createPatientSchema = z.object({
  firstName:          z.string().min(1, 'First name required'),
  lastName:           z.string().min(1, 'Last name required'),
  nickname:           z.string().optional(),

  // Contact — all optional
  phone:              z.string().optional().nullable(),
  altPhone:           z.string().optional().nullable(),
  email:              z.string().email().optional().nullable(),

  // Demographics — all optional
  dateOfBirth:        z.string().datetime().optional().nullable(),
  gender:             z.enum(['M','F','Other','Prefer not to say']).optional().nullable(),
  bloodGroup:         z.enum(['A+','A-','B+','B-','O+','O-','AB+','AB-','Unknown'])
                        .optional().nullable(),

  // Identity docs — all optional
  nationalId:         z.string().optional().nullable(),
  nhifNo:             z.string().optional().nullable(),
  passportNo:         z.string().optional().nullable(),
  birthCertNo:        z.string().optional().nullable(),

  // Insurance — all optional
  insurance:          z.string().optional().nullable(),
  policyNo:           z.string().optional().nullable(),
  insuranceExpiry:    z.string().datetime().optional().nullable(),

  // Clinical flags
  pregnancyStatus:    z.enum(['NOT_PREGNANT','PREGNANT','BREASTFEEDING','UNKNOWN'])
                        .default('UNKNOWN'),
  isBreastfeeding:    z.boolean().default(false),
  chronicConditions:  z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([]),
})

export const updatePatientSchema = createPatientSchema.partial()

export const createAllergySchema = z.object({
  allergen:    z.string().min(1, 'Allergen name required'),
  allergenType:z.enum(['DRUG','FOOD','ENVIRONMENTAL','OTHER']),
  severity:    z.enum(['MILD','MODERATE','SEVERE','LIFE_THREATENING','UNKNOWN']),
  reaction:    z.string().optional(),
  notes:       z.string().optional(),
})

export const patientSearchSchema = z.object({
  q:         z.string().optional(),        // name, phone, ID fuzzy search
  condition: z.string().optional(),
  insurance: z.string().optional(),
  refillDue: z.coerce.boolean().optional(),
  page:      z.coerce.number().default(1),
  limit:     z.coerce.number().min(1).max(100).default(20),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
export type CreateAllergyInput = z.infer<typeof createAllergySchema>
export type PatientSearchInput = z.infer<typeof patientSearchSchema>


