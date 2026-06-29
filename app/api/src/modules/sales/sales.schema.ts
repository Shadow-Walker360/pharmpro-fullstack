// ════════════════════════════════════════════════════════════
// modules/sales/sales.schema.ts
// ════════════════════════════════════════════════════════════
import { z } from 'zod'

export const saleItemSchema = z.object({
  drugId:      z.string().uuid('Invalid drug ID'),
  inventoryId: z.string().uuid('Invalid inventory ID'),
  quantity:    z.number().int().positive('Quantity must be positive'),
  unitPrice:   z.number().positive('Unit price required'),
})

export const createSaleSchema = z.object({
  patientId:   z.string().uuid().optional().nullable(), // optional — walk-in
  items:       z.array(saleItemSchema).min(1, 'At least one item required'),
  discount:    z.number().min(0).max(100).default(0),  // percentage
  payments:    z.array(z.object({
    method:      z.enum(['CASH','MPESA','CARD','INSURANCE','NHIF','CREDIT']),
    amount:      z.number().positive(),
    reference:   z.string().optional(),
    mpesaPhone:  z.string().optional(),
  })).min(1, 'At least one payment required'),
  prescriptionId: z.string().uuid().optional().nullable(),
  notes:          z.string().optional(),
})

export const mpesaStkSchema = z.object({
  phone:   z.string().min(9, 'Valid phone required'),
  amount:  z.number().positive(),
  saleRef: z.string().optional(),
})

export const refundSchema = z.object({
  saleId:  z.string().uuid(),
  reason:  z.string().min(1, 'Refund reason required'),
  items:   z.array(z.object({
    saleItemId: z.string().uuid(),
    quantity:   z.number().int().positive(),
  })).min(1),
})

export const salesSearchSchema = z.object({
  q:         z.string().optional(),
  method:    z.enum(['CASH','MPESA','CARD','INSURANCE','NHIF','CREDIT']).optional(),
  status:    z.enum(['COMPLETED','REFUNDED','VOID','PENDING']).optional(),
  patientId: z.string().uuid().optional(),
  cashierId: z.string().uuid().optional(),
  dateFrom:  z.string().optional(),
  dateTo:    z.string().optional(),
  page:      z.coerce.number().default(1),
  limit:     z.coerce.number().min(1).max(100).default(20),
})

export type CreateSaleInput   = z.infer<typeof createSaleSchema>
export type MpesaStkInput     = z.infer<typeof mpesaStkSchema>
export type RefundInput       = z.infer<typeof refundSchema>
export type SalesSearchInput  = z.infer<typeof salesSearchSchema>