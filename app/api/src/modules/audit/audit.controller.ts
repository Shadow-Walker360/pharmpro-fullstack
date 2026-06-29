// ════════════════════════════════════════════════════════════
// modules/audit/audit.controller.ts + router
// ════════════════════════════════════════════════════════════
import { Request, Response, NextFunction } from 'express'
import { auditService, auditSearchSchema } from './audit.service'

export class AuditController {

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const input  = auditSearchSchema.parse(req.query)
      const result = await auditService.search(input, req.branchId!)
      res.json({ success: true, ...result })
    } catch (e) { next(e) }
  }

  async getReadLog(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await auditService.getReadLog(
        req.branchId!, req.query.patientId as string | undefined,
      )
      res.json({ success: true, data: logs })
    } catch (e) { next(e) }
  }

  async getControlledLog(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await auditService.getControlledLog(req.branchId!)
      res.json({ success: true, data: logs })
    } catch (e) { next(e) }
  }

  async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await auditService.getSummary(req.branchId!)
      res.json({ success: true, data: summary })
    } catch (e) { next(e) }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const { from, to } = req.query as { from: string; to: string }
      if (!from || !to) throw Object.assign(new Error('from and to required'), { status: 400 })
      const csv = await auditService.exportCsv(req.branchId!, from, to)

      // Log the export itself
      await import('../../config/prisma').then(({ prisma }) =>
        prisma.auditLog.create({
          data: {
            branchId:   req.branchId!,
            userId:     req.user!.sub,
            action:     'EXPORT',
            entityType: 'AuditLog',
            entityId:   `${from}:${to}`,
            ipAddress:  req.ip,
          },
        }),
      )

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="audit-${from}-${to}.csv"`)
      res.send(csv)
    } catch (e) { next(e) }
  }
}

export const auditController = new AuditController()

import { Router }         from 'express'
import { authenticate }   from '../../middleware/authenticate'
import { authorize }      from '../../middleware/authorize'

export const auditRouter = Router()
auditRouter.use(authenticate)
auditRouter.use(authorize(['SUPER_ADMIN','PHARMACIST']))

auditRouter.get('/summary',    auditController.getSummary.bind(auditController))
auditRouter.get('/',           auditController.search.bind(auditController))
auditRouter.get('/reads',      auditController.getReadLog.bind(auditController))
auditRouter.get('/controlled', auditController.getControlledLog.bind(auditController))
auditRouter.get('/export',
  authorize(['SUPER_ADMIN']),
  auditController.exportCsv.bind(auditController),
)


