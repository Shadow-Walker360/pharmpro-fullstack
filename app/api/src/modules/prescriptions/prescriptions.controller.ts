// ════════════════════════════════════════════════════════════
// modules/prescriptions/prescriptions.controller.ts
// ════════════════════════════════════════════════════════════

import { Request, Response, NextFunction }  from 'express'
import { prescriptionsService }             from './prescriptions.service'
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
  dispenseSchema,
  refillSchema,
  rxSearchSchema,
}                                           from './prescriptions.schema'

export class PrescriptionsController {

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = createPrescriptionSchema.parse(req.body)
      const result = await prescriptionsService.create(input, req.branchId!, req.user!.sub)
      res.status(201).json({ success: true, data: result })
    } catch (e) { next(e) }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = rxSearchSchema.parse(req.query)
      const result = await prescriptionsService.search(input, req.branchId!)
      res.json({ success: true, ...result })
    } catch (e) { next(e) }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const rx = await prescriptionsService.findById(req.params.id, req.branchId!)
      res.json({ success: true, data: rx })
    } catch (e) { next(e) }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const rx = await prescriptionsService.verify(
        req.params.id, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: rx })
    } catch (e) { next(e) }
  }

  async dispense(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = dispenseSchema.parse(req.body)
      const result = await prescriptionsService.dispense(
        req.params.id, input, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }

  async refill(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = refillSchema.parse(req.body)
      const result = await prescriptionsService.refill(
        req.params.id, input, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body
      if (!reason) throw Object.assign(new Error('Cancellation reason required'), { status: 400 })
      await prescriptionsService.cancel(
        req.params.id, reason, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, message: 'Prescription cancelled' })
    } catch (e) { next(e) }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body
      if (!status) throw Object.assign(new Error('Status required'), { status: 400 })
      const rx = await prescriptionsService.updateStatus(
        req.params.id, status, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: rx })
    } catch (e) { next(e) }
  }

  async preCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, drugIds } = req.body
      if (!patientId || !Array.isArray(drugIds) || !drugIds.length) {
        throw Object.assign(new Error('patientId and drugIds[] required'), { status: 400 })
      }
      const result = await prescriptionsService.preCheck(
        patientId, drugIds, req.branchId!,
      )
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }

  async getQueueStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await prescriptionsService.getQueueStats(req.branchId!)
      res.json({ success: true, data: stats })
    } catch (e) { next(e) }
  }
}

export const prescriptionsController = new PrescriptionsController()


