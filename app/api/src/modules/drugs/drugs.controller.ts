// ════════════════════════════════════════════════════════════
// modules/drugs/drugs.controller.ts
// ════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express'
import { drugsService }                    from './drugs.service'
import {
  createDrugSchema,
  updateDrugSchema,
  drugSearchSchema,
  interactionCheckSchema,
  addInteractionSchema,
}                                          from './drugs.schema'

export class DrugsController {

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createDrugSchema.parse(req.body)
      const drug  = await drugsService.create(input, req.user!.sub)
      res.status(201).json({ success: true, data: drug })
    } catch (e) { next(e) }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = drugSearchSchema.parse(req.query)
      const result = await drugsService.search(input)
      res.json({ success: true, ...result })
    } catch (e) { next(e) }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const drug = await drugsService.findById(req.params.id)
      res.json({ success: true, data: drug })
    } catch (e) { next(e) }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateDrugSchema.parse(req.body)
      const drug  = await drugsService.update(req.params.id, input, req.user!.sub)
      res.json({ success: true, data: drug })
    } catch (e) { next(e) }
  }

  async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      await drugsService.softDelete(req.params.id, req.user!.sub)
      res.json({ success: true, message: 'Drug deactivated' })
    } catch (e) { next(e) }
  }

  async checkInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const { drugAId, drugBId } = interactionCheckSchema.parse(req.query)
      const result = await drugsService.checkInteraction(drugAId, drugBId)
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }

  async addInteraction(req: Request, res: Response, next: NextFunction) {
    try {
      const input = addInteractionSchema.parse(req.body)
      const ix    = await drugsService.addInteraction(input, req.user!.sub)
      res.status(201).json({ success: true, data: ix })
    } catch (e) { next(e) }
  }

  async recallBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body
      if (!reason) throw Object.assign(new Error('Recall reason required'), { status: 400 })
      const result = await drugsService.recallBatch(req.params.batchId, reason, req.user!.sub)
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }
}

export const drugsController = new DrugsController()


