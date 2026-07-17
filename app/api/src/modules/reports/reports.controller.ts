//════════════════════════════════════════════════════════════
// modules/reports/reports.controller.ts + router
// ════════════════════════════════════════════════════════════
import { Request, Response, NextFunction }   from 'express'
import { reportsService, reportParamsSchema } from './reports.service'

class ReportsController {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const params = reportParamsSchema.parse(req.query)
      const result = await reportsService.generate(params, req.branchId!, req.user!.sub)
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  }

  async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const status = await reportsService.getJobStatus(req.params.jobId)
      res.json({ success: true, data: status })
    } catch (e) { next(e) }
  }
}

const reportsController = new ReportsController()

import { Router }       from 'express'
import { authenticate } from '../../middleware/authenticate'
import { authorize }    from '../../middleware/authorize'

export const reportsRouter = Router()
reportsRouter.use(authenticate)
reportsRouter.use(authorize(['SUPER_ADMIN','PHARMACIST','ACCOUNTANT','STORE_MANAGER']))
reportsRouter.get('/',          reportsController.generate.bind(reportsController))
reportsRouter.get('/jobs/:jobId', reportsController.getJobStatus.bind(reportsController))


