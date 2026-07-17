// ════════════════════════════════════════════════════════════
// modules/inventory/inventory.controller.ts
// ════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express'
import { inventoryService }                from './inventory.service'
import {
  receiveStockSchema,
  adjustStockSchema,
  inventorySearchSchema,
}                                          from './inventory.schema'

export class InventoryController {

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = inventorySearchSchema.parse(req.query)
      const result = await inventoryService.list(input, req.branchId!)
      res.json({ success: true, ...result })
    } catch (e) { next(e) }
  }

  async receiveStock(req: Request, res: Response, next: NextFunction) {
    try {
      const input = receiveStockSchema.parse(req.body)
      const item  = await inventoryService.receiveStock(input, req.branchId!, req.user!.sub)
      res.status(201).json({ success: true, data: item })
    } catch (e) { next(e) }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction) {
    try {
      const input = adjustStockSchema.parse(req.body)
      const item  = await inventoryService.adjustStock(input, req.branchId!, req.user!.sub)
      res.json({ success: true, data: item })
    } catch (e) { next(e) }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await inventoryService.getStats(req.branchId!)
      res.json({ success: true, data: stats })
    } catch (e) { next(e) }
  }

  async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await inventoryService.getLowStock(req.branchId!)
      res.json({ success: true, data: items })
    } catch (e) { next(e) }
  }

  async getExpiring(req: Request, res: Response, next: NextFunction) {
    try {
      const days  = Number(req.query.days ?? 30)
      const items = await inventoryService.getExpiring(req.branchId!, days)
      res.json({ success: true, data: items })
    } catch (e) { next(e) }
  }

  async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const limit  = Number(req.query.limit ?? 50)
      const ledger = await inventoryService.getLedger(req.params.drugId, req.branchId!, limit)
      res.json({ success: true, data: ledger })
    } catch (e) { next(e) }
  }
}

export const inventoryController = new InventoryController()


