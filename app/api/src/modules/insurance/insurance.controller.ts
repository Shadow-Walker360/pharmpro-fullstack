/ ════════════════════════════════════════════════════════════
// modules/insurance/insurance.controller.ts
// ════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'
import { insuranceService }                from './insurance.service'
import {
  createClaimSchema,
  updateClaimSchema,
  claimSearchSchema,
}                                          from './insurance.schema'

export class InsuranceController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createClaimSchema.parse(req.body)
      const claim = await insuranceService.createClaim(input, req.branchId!, req.user!.sub)
      res.status(201).json({ success: true, data: claim })
    } catch (e) { next(e) }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = claimSearchSchema.parse(req.query)
      const result = await insuranceService.search(input, req.branchId!)
      res.json({ success: true, ...result })
    } catch (e) { next(e) }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await insuranceService.getStats(req.branchId!)
      res.json({ success: true, data: stats })
    } catch (e) { next(e) }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const input   = updateClaimSchema.parse(req.body)
      const updated = await insuranceService.updateClaimStatus(
        req.params.claimNo, input, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: updated })
    } catch (e) { next(e) }
  }

  async resubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await insuranceService.resubmit(
        req.params.claimNo, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }
}

export const insuranceController = new InsuranceController()


