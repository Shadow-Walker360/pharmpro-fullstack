// ════════════════════════════════════════════════════════════
// modules/patients/patients.controller.ts
// ════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express'
import { patientsService }                 from './patients.service'
import {
  createPatientSchema,
  updatePatientSchema,
  createAllergySchema,
  patientSearchSchema,
}                                          from './patients.schema'

export class PatientsController {

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input   = createPatientSchema.parse(req.body)
      const patient = await patientsService.create(input, req.branchId!, req.user!.sub)
      res.status(201).json({ success: true, data: patient })
    } catch (e) { next(e) }
  }

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = patientSearchSchema.parse(req.query)
      const result = await patientsService.search(input, req.branchId!)
      res.json({ success: true, ...result })
    } catch (e) { next(e) }
  }

  async findById(req: Request, res: Response, next: NextFunction) {
    try {
      const patient = await patientsService.findById(
        req.params.id, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: patient })
    } catch (e) { next(e) }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input   = updatePatientSchema.parse(req.body)
      const patient = await patientsService.update(
        req.params.id, input, req.branchId!, req.user!.sub,
      )
      res.json({ success: true, data: patient })
    } catch (e) { next(e) }
  }

  async softDelete(req: Request, res: Response, next: NextFunction) {
    try {
      await patientsService.softDelete(req.params.id, req.branchId!, req.user!.sub)
      res.json({ success: true, message: 'Patient record archived' })
    } catch (e) { next(e) }
  }

  async addAllergy(req: Request, res: Response, next: NextFunction) {
    try {
      const input   = createAllergySchema.parse(req.body)
      const allergy = await patientsService.addAllergy(
        req.params.id, input, req.branchId!, req.user!.sub,
      )
      res.status(201).json({ success: true, data: allergy })
    } catch (e) { next(e) }
  }

  async getAllergies(req: Request, res: Response, next: NextFunction) {
    try {
      const allergies = await patientsService.getAllergies(req.params.id, req.branchId!)
      res.json({ success: true, data: allergies })
    } catch (e) { next(e) }
  }

  async getRefillsDue(req: Request, res: Response, next: NextFunction) {
    try {
      const patients = await patientsService.getRefillsDue(req.branchId!)
      res.json({ success: true, data: patients })
    } catch (e) { next(e) }
  }

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await patientsService.getStats(req.branchId!)
      res.json({ success: true, data: stats })
    } catch (e) { next(e) }
  }
}

export const patientsController = new PatientsController()
