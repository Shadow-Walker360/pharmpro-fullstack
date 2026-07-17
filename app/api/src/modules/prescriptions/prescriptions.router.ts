// ════════════════════════════════════════════════════════════
// modules/prescriptions/prescriptions.router.ts
// ════════════════════════════════════════════════════════════

import { Router }                   from 'express'
import { prescriptionsController }  from './prescriptions.controller'
import { authenticate }             from '../../middleware/authenticate'
import { authorize }                from '../../middleware/authorize'

const router = Router()
router.use(authenticate)

// Stats + utility
router.get  ('/queue-stats',      prescriptionsController.getQueueStats.bind(prescriptionsController))
router.post ('/pre-check',        prescriptionsController.preCheck.bind(prescriptionsController))

// CRUD
router.get  ('/',                 prescriptionsController.search.bind(prescriptionsController))
router.post ('/',
  authorize(['SUPER_ADMIN','PHARMACIST','TECHNICIAN']),
  prescriptionsController.create.bind(prescriptionsController),
)
router.get  ('/:id',              prescriptionsController.findById.bind(prescriptionsController))

// Lifecycle transitions
router.patch('/:id/verify',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  prescriptionsController.verify.bind(prescriptionsController),
)
router.patch('/:id/status',
  authorize(['SUPER_ADMIN','PHARMACIST','TECHNICIAN']),
  prescriptionsController.updateStatus.bind(prescriptionsController),
)
router.post ('/:id/dispense',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  prescriptionsController.dispense.bind(prescriptionsController),
)
router.post ('/:id/refill',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  prescriptionsController.refill.bind(prescriptionsController),
)
router.patch('/:id/cancel',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  prescriptionsController.cancel.bind(prescriptionsController),
)

export default router


