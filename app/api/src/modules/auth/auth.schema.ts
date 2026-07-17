// ════════════════════════════════════════════════════════════
// auth.schema.ts — Zod request validation
// ════════════════════════════════════════════════════════════

import { z } from 'zod'

export const loginSchema = z.object({
  email:    z.string().email({ message: 'Valid email required' }),
  password: z.string().min(1, { message: 'Password required' }),
})

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  password:  z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
  role:      z.enum(['SUPER_ADMIN','PHARMACIST','TECHNICIAN','CASHIER','STORE_MANAGER','ACCOUNTANT']),
  branchId:  z.string().uuid(),
  phone:     z.string().optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z
    .string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number'),
})

export type LoginInput          = z.infer<typeof loginSchema>
export type RefreshInput        = z.infer<typeof refreshSchema>
export type RegisterInput       = z.infer<typeof registerSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>


