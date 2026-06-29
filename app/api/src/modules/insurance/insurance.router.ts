// ════════════════════════════════════════════════════════════
// modules/insurance/insurance.router.ts
// ════════════════════════════════════════════════════════════
import { Router }              from 'express'
import { insuranceController } from './insurance.controller'
import { authenticate }        from '../../middleware/authenticate'
import { authorize }           from '../../middleware/authorize'

const router = Router()
router.use(authenticate)

router.get ('/stats',                  insuranceController.getStats.bind(insuranceController))
router.get ('/',                       insuranceController.search.bind(insuranceController))
router.post('/',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  insuranceController.create.bind(insuranceController),
)
router.patch('/:claimNo/status',
  authorize(['SUPER_ADMIN','PHARMACIST','ACCOUNTANT']),
  insuranceController.updateStatus.bind(insuranceController),
)
router.post('/:claimNo/resubmit',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  insuranceController.resubmit.bind(insuranceController),
)

export default router