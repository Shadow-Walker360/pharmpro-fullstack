// ════════════════════════════════════════════════════════════
// modules/finance/finance.schema.ts
// ════════════════════════════════════════════════════════════
import { z } from 'zod'

export const createExpenseSchema = z.object({
  category:    z.enum([
    'RENT','UTILITIES','SALARIES','EQUIPMENT',
    'MARKETING','TRANSPORT','MAINTENANCE','OTHER',
  ]),
  description: z.string().min(1, 'Description required'),
  amount:      z.number().positive('Amount required'),
  expenseDate: z.string().datetime().optional(),
  receiptUrl:  z.string().url().optional(),
})

export const financeRangeSchema = z.object({
  from:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  to:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  branchId: z.string().uuid().optional(), // super admin can query any branch
})

export const plSchema = financeRangeSchema

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type FinanceRangeInput  = z.infer<typeof financeRangeSchema>
