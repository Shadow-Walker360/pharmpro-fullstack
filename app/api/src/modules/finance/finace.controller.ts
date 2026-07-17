//════════════════════════════════════════════════════════════
// modules/finance/finance.controller.ts
// ════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'
import { financeService }                  from './finance.service'
import {
  createExpenseSchema,
  financeRangeSchema,
}                                          from './finance.schema'

export class FinanceController {

  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const input   = createExpenseSchema.parse(req.body)
      const expense = await financeService.createExpense(input, req.branchId!, req.user!.sub)
      res.status(201).json({ success: true, data: expense })
    } catch (e) { next(e) }
  }

  async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const input = financeRangeSchema.parse(req.query)
      const data  = await financeService.listExpenses(input, req.branchId!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  }

  async getProfitAndLoss(req: Request, res: Response, next: NextFunction) {
    try {
      const input = financeRangeSchema.parse(req.query)
      const data  = await financeService.getProfitAndLoss(input, req.branchId!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  }

  async getDrugProfitability(req: Request, res: Response, next: NextFunction) {
    try {
      const input = financeRangeSchema.parse(req.query)
      const data  = await financeService.getDrugProfitability(input, req.branchId!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  }

  async getDailyRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const input = financeRangeSchema.parse(req.query)
      const data  = await financeService.getDailyRevenue(input, req.branchId!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  }

  async getInventoryValuation(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await financeService.getInventoryValuation(req.branchId!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  }

  async getPaymentBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const input = financeRangeSchema.parse(req.query)
      const data  = await financeService.getPaymentBreakdown(input, req.branchId!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  }
}

export const financeController = new FinanceController()


