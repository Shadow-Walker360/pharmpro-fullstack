// ════════════════════════════════════════════════════════════
// modules/insurance/insurance.schema.ts
// ════════════════════════════════════════════════════════════
import { z } from 'zod'

export const createClaimSchema = z.object({
  patientId:      z.string().uuid('Invalid patient ID'),
  prescriptionId: z.string().uuid('Invalid prescription ID'),
  insurer:        z.enum(['NHIF','AAR','UAP','JUBILEE','CIC','BRITAM','APA','OTHER']),
  policyNo:       z.string().optional(),
  preAuthCode:    z.string().optional(),
  drugDispensed:  z.string().min(1, 'Drug name required'),
  claimValue:     z.number().positive('Claim value required'),
  notes:          z.string().optional(),
})

export const updateClaimSchema = z.object({
  status:           z.enum(['PENDING','APPROVED','REJECTED','RESUBMITTED','PAID']),
  approvedAmount:   z.number().optional(),
  rejectionReason:  z.string().optional(),
  paymentRef:       z.string().optional(),
  paidAt:           z.string().datetime().optional(),
})

export const claimSearchSchema = z.object({
  insurer:  z.string().optional(),
  status:   z.enum(['PENDING','APPROVED','REJECTED','RESUBMITTED','PAID']).optional(),
  from:     z.string().optional(),
  to:       z.string().optional(),
  page:     z.coerce.number().default(1),
  limit:    z.coerce.number().min(1).max(100).default(20),
})

export type CreateClaimInput  = z.infer<typeof createClaimSchema>
export type UpdateClaimInput  = z.infer<typeof updateClaimSchema>
export type ClaimSearchInput  = z.infer<typeof claimSearchSchema>


/