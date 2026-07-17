// ════════════════════════════════════════════════════════════
// modules/drugs/drugs.schema.ts
// ════════════════════════════════════════════════════════════

import { z } from 'zod'

export const createDrugSchema = z.object({
  brandName:          z.string().min(1, 'Brand name required'),
  genericName:        z.string().min(1, 'Generic name required'),
  drugClass:          z.string().optional(),
  dosageForm:         z.string().optional(),
  standardDose:       z.string().optional(),
  pregnancyCategory:  z.enum(['A','B','C','D','X']).optional(),
  contraindications:  z.string().optional(),
  storage:            z.string().optional(),
  manufacturer:       z.string().optional(),
  controlledCategory: z.enum([
    'OTC','PRESCRIPTION_ONLY','RESTRICTED',
    'SCHEDULE_I','SCHEDULE_II','SCHEDULE_III',
  ]).default('OTC'),
})

export const updateDrugSchema = createDrugSchema.partial()

export const drugSearchSchema = z.object({
  q:       z.string().optional(),
  class:   z.string().optional(),
  form:    z.string().optional(),
  controlled: z.coerce.boolean().optional(),
  page:    z.coerce.number().default(1),
  limit:   z.coerce.number().min(1).max(100).default(20),
})

export const interactionCheckSchema = z.object({
  drugAId: z.string().uuid('Invalid drug A ID'),
  drugBId: z.string().uuid('Invalid drug B ID'),
})

export const addInteractionSchema = z.object({
  drugAId:     z.string().uuid(),
  drugBId:     z.string().uuid(),
  severity:    z.enum(['MINOR','MODERATE','MAJOR','CONTRAINDICATED']),
  description: z.string().min(1),
  mechanism:   z.string().optional(),
  source:      z.string().optional(),
})

export type CreateDrugInput        = z.infer<typeof createDrugSchema>
export type UpdateDrugInput        = z.infer<typeof updateDrugSchema>
export type DrugSearchInput        = z.infer<typeof drugSearchSchema>
export type InteractionCheckInput  = z.infer<typeof interactionCheckSchema>
export type AddInteractionInput    = z.infer<typeof addInteractionSchema>


