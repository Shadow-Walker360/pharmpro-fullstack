// ════════════════════════════════════════════════════════════
// modules/inventory/inventory.schema.ts
// ════════════════════════════════════════════════════════════

import { z } from 'zod'

export const receiveStockSchema = z.object({
  drugId:       z.string().uuid('Invalid drug ID'),
  batchNo:      z.string().min(1, 'Batch number required'),
  expiryDate:   z.string().datetime({ message: 'Valid expiry date required' }),
  quantity:     z.number().int().positive('Quantity must be positive'),
  unitCost:     z.number().positive('Unit cost required'),
  sellingPrice: z.number().positive('Selling price required'),
  supplierId:   z.string().uuid().optional(),
  reorderLevel: z.number().int().positive().optional(),
})

export const adjustStockSchema = z.object({
  inventoryId: z.string().uuid(),
  quantity:    z.number().int().refine(n => n !== 0, 'Quantity cannot be zero'),
  reason:      z.string().min(1, 'Reason required for stock adjustment'),
  type:        z.enum(['ADJUSTMENT','DAMAGED','EXPIRED','RETURN','TRANSFER_IN','TRANSFER_OUT']),
})

export const inventorySearchSchema = z.object({
  q:        z.string().optional(),
  status:   z.enum(['critical','low','expiring','normal','good']).optional(),
  category: z.string().optional(),
  page:     z.coerce.number().default(1),
  limit:    z.coerce.number().min(1).max(100).default(20),
})

export type ReceiveStockInput   = z.infer<typeof receiveStockSchema>
export type AdjustStockInput    = z.infer<typeof adjustStockSchema>
export type InventorySearchInput= z.infer<typeof inventorySearchSchema>


