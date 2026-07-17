// ════════════════════════════════════════════════════════════
// modules/inventory/inventory.service.ts
// Key design decisions:
// 1. Stock is decremented inside a DB transaction with
//    SELECT FOR UPDATE to prevent race conditions.
// 2. Every movement writes an InventoryTransaction ledger row.
// 3. Current stock = sum of ledger — snapshot in Inventory
//    is a cache that must always match the ledger.
// ════════════════════════════════════════════════════════════

import { prisma }  from '../../config/prisma'
import { logger }  from '../../lib/logger'
import { redis }   from '../../config/redis'
import type {
  ReceiveStockInput,
  AdjustStockInput,
  InventorySearchInput,
} from './inventory.schema'

export class InventoryService {

  // ── Receive stock (PO receive or direct receive) ──────
  async receiveStock(input: ReceiveStockInput, branchId: string, receivedById: string) {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert inventory record for this drug+batch in this branch
      const inv = await tx.inventory.upsert({
        where: {
          branchId_drugId_batchNo: {
            branchId,
            drugId:  input.drugId,
            batchNo: input.batchNo,
          },
        },
        update: {
          quantityOnHand: { increment: input.quantity },
          unitCost:       input.unitCost,
          sellingPrice:   input.sellingPrice,
          expiryDate:     new Date(input.expiryDate),
          supplierId:     input.supplierId,
          ...(input.reorderLevel && { reorderLevel: input.reorderLevel }),
        },
        create: {
          branchId,
          drugId:        input.drugId,
          batchNo:       input.batchNo,
          expiryDate:    new Date(input.expiryDate),
          quantityOnHand: input.quantity,
          reorderLevel:  input.reorderLevel ?? 20,
          unitCost:      input.unitCost,
          sellingPrice:  input.sellingPrice,
          markupPercent: Number(
            ((input.sellingPrice - input.unitCost) / input.unitCost * 100).toFixed(2),
          ),
          supplierId: input.supplierId,
        },
      })

      // Write ledger entry
      await tx.inventoryTransaction.create({
        data: {
          branchId,
          drugId:      input.drugId,
          inventoryId: inv.id,
          type:        'PURCHASE',
          quantity:    input.quantity,   // positive = stock in
          createdById: receivedById,
        },
      })

      // Also create / update MedicationBatch for traceability
      await tx.medicationBatch.upsert({
        where: { id: `batch-${input.batchNo}-${input.drugId}` },
        update: { quantityReceived: { increment: input.quantity } },
        create: {
          id:               `batch-${input.batchNo}-${input.drugId}`,
          drugId:           input.drugId,
          supplierId:       input.supplierId,
          batchNo:          input.batchNo,
          expiryDate:       new Date(input.expiryDate),
          quantityReceived: input.quantity,
        },
      })

      return inv
    })

    // Invalidate cached stock stats
    await redis.del(`inv:stats:${branchId}`)

    logger.info(
      { branchId, drugId: input.drugId, quantity: input.quantity, batch: input.batchNo },
      'Stock received',
    )

    return result
  }

  // ── Deduct stock (called by sales service inside its own tx) ──
  // This method is called INSIDE an existing transaction (tx).
  // It uses SELECT FOR UPDATE to lock the row, preventing
  // concurrent sales from over-dispensing the same stock.
  async deductStock(
    tx: any,  // Prisma transaction client
    inventoryId: string,
    quantity:    number,
    saleId:      string,
    soldById:    string,
    branchId:    string,
  ): Promise<void> {
    // Lock the row
    const inv = await tx.$queryRaw<{ id: string; quantity_on_hand: number }[]>`
      SELECT id, quantity_on_hand
      FROM inventory
      WHERE id = ${inventoryId}
      FOR UPDATE
    `

    if (!inv[0]) throw Object.assign(new Error('Inventory record not found'), { status: 404 })
    if (inv[0].quantity_on_hand < quantity) {
      throw Object.assign(
        new Error(`Insufficient stock. Available: ${inv[0].quantity_on_hand}, requested: ${quantity}`),
        { status: 409 },
      )
    }

    // Decrement
    await tx.inventory.update({
      where: { id: inventoryId },
      data:  { quantityOnHand: { decrement: quantity } },
    })

    // Ledger entry
    await tx.inventoryTransaction.create({
      data: {
        branchId,
        drugId:      (await tx.inventory.findUnique({ where: { id: inventoryId }, select: { drugId: true } })).drugId,
        inventoryId,
        type:        'SALE',
        quantity:    -quantity,  // negative = stock out
        referenceId: saleId,
        createdById: soldById,
      },
    })
  }

  // ── Manual stock adjustment ────────────────────────────
  async adjustStock(input: AdjustStockInput, branchId: string, adjustedById: string) {
    const result = await prisma.$transaction(async (tx) => {
      const inv = await tx.inventory.findFirst({
        where: { id: input.inventoryId, branchId },
      })
      if (!inv) throw Object.assign(new Error('Inventory item not found'), { status: 404 })

      const newQty = inv.quantityOnHand + input.quantity
      if (newQty < 0) {
        throw Object.assign(
          new Error(`Adjustment would result in negative stock (current: ${inv.quantityOnHand})`),
          { status: 400 },
        )
      }

      const updated = await tx.inventory.update({
        where: { id: input.inventoryId },
        data:  { quantityOnHand: newQty },
      })

      await tx.inventoryTransaction.create({
        data: {
          branchId,
          drugId:      inv.drugId,
          inventoryId: inv.id,
          type:        input.type as any,
          quantity:    input.quantity,
          reason:      input.reason,
          createdById: adjustedById,
        },
      })

      await tx.auditLog.create({
        data: {
          branchId,
          userId:     adjustedById,
          action:     'UPDATE',
          entityType: 'Inventory',
          entityId:   inv.id,
          oldValue:   { quantityOnHand: inv.quantityOnHand } as any,
          newValue:   { quantityOnHand: newQty, reason: input.reason } as any,
        },
      })

      return updated
    })

    await redis.del(`inv:stats:${branchId}`)
    logger.info({ inventoryId: input.inventoryId, adjustment: input.quantity, reason: input.reason }, 'Stock adjusted')
    return result
  }

  // ── List inventory with search + filter ───────────────
  async list(input: InventorySearchInput, branchId: string) {
    const { q, status, page, limit } = input
    const skip = (page - 1) * limit

    const now       = new Date()
    const in30Days  = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Status filter maps to different where conditions
    const statusWhere: Record<string, any> = {
      critical: { quantityOnHand: { lte: 15 } },
      low:      { quantityOnHand: { gt: 0, lte: prisma.inventory.fields.reorderLevel } },
      expiring: { expiryDate: { lte: in30Days, gte: now } },
      normal:   { quantityOnHand: { gt: 15 } },
      good:     { quantityOnHand: { gt: 50 } },
    }

    const where: any = {
      branchId,
      ...(status ? statusWhere[status] : {}),
      ...(q && {
        drug: {
          OR: [
            { brandName:   { contains: q, mode: 'insensitive' } },
            { genericName: { contains: q, mode: 'insensitive' } },
          ],
        },
      }),
    }

    const [items, total] = await prisma.$transaction([
      prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ quantityOnHand: 'asc' }, { expiryDate: 'asc' }],
        include: {
          drug:     { select: { brandName: true, genericName: true, drugClass: true, dosageForm: true } },
          supplier: { select: { name: true } },
        },
      }),
      prisma.inventory.count({ where }),
    ])

    // Annotate each item with stock status
    const annotated = items.map(item => ({
      ...item,
      stockStatus: this.getStockStatus(item.quantityOnHand, item.reorderLevel, item.expiryDate),
      daysUntilExpiry: item.expiryDate
        ? Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }))

    return {
      data: annotated,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    }
  }

  private getStockStatus(qty: number, reorderLevel: number, expiryDate: Date | null): string {
    if (qty === 0) return 'out_of_stock'
    const daysToExpiry = expiryDate
      ? Math.ceil((expiryDate.getTime() - Date.now()) / 86_400_000)
      : 9999
    if (daysToExpiry <= 0)  return 'expired'
    if (daysToExpiry <= 30) return 'expiring'
    if (qty <= 10)          return 'critical'
    if (qty <= reorderLevel)return 'low'
    return 'good'
  }

  // ── Get low stock items (for alerts) ──────────────────
  async getLowStock(branchId: string) {
    return prisma.inventory.findMany({
      where: {
        branchId,
        quantityOnHand: { lte: prisma.inventory.fields.reorderLevel },
      },
      include: { drug: { select: { genericName: true, brandName: true } } },
      orderBy: { quantityOnHand: 'asc' },
    })
  }

  // ── Get expiring items ────────────────────────────────
  async getExpiring(branchId: string, withinDays = 30) {
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)
    return prisma.inventory.findMany({
      where: {
        branchId,
        expiryDate: { lte: cutoff, gte: new Date() },
        quantityOnHand: { gt: 0 },
      },
      include: { drug: { select: { genericName: true, brandName: true } } },
      orderBy: { expiryDate: 'asc' },
    })
  }

  // ── Dashboard stats (Redis-cached 5 min) ─────────────
  async getStats(branchId: string) {
    const cacheKey = `inv:stats:${branchId}`
    const cached   = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const now      = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const [totalSKUs, lowStock, expiring, outOfStock, totalValue] = await prisma.$transaction([
      prisma.inventory.count({ where: { branchId } }),
      prisma.inventory.count({
        where: { branchId, quantityOnHand: { gt: 0, lte: 20 } },
      }),
      prisma.inventory.count({
        where: { branchId, expiryDate: { lte: in30Days, gte: now }, quantityOnHand: { gt: 0 } },
      }),
      prisma.inventory.count({
        where: { branchId, quantityOnHand: 0 },
      }),
      // Total stock value
      prisma.inventory.aggregate({
        where: { branchId },
        _sum:  { quantityOnHand: true },
      }),
    ])

    // Stock value needs a raw query for sum of qty * unitCost
    const valueResult = await prisma.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM(quantity_on_hand * unit_cost), 0)::numeric AS total
      FROM inventory
      WHERE branch_id = ${branchId}
    `

    const stats = {
      totalSKUs,
      lowStock,
      expiring,
      outOfStock,
      totalStockValue: Number(valueResult[0]?.total ?? 0),
    }

    await redis.setex(cacheKey, 300, JSON.stringify(stats)) // cache 5 min
    return stats
  }

  // ── Ledger history for a drug ─────────────────────────
  async getLedger(drugId: string, branchId: string, limit = 50) {
    return prisma.inventoryTransaction.findMany({
      where:   { drugId, branchId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
      include: { createdBy: { select: { firstName: true, lastName: true, role: true } } },
    })
  }
}

export const inventoryService = new InventoryService()


