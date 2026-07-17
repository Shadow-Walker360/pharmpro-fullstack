// ════════════════════════════════════════════════════════════
// modules/drugs/drugs.router.ts
// ════════════════════════════════════════════════════════════

import { Router }         from 'express'
import { drugsController} from './drugs.controller'
import { authenticate }   from '../../middleware/authenticate'
import { authorize }      from '../../middleware/authorize'

const router = Router()
router.use(authenticate)

// Drug CRUD
router.get ('/',     drugsController.search.bind(drugsController))
router.post('/',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  drugsController.create.bind(drugsController),
)
router.get ('/:id',  drugsController.findById.bind(drugsController))
router.patch('/:id',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  drugsController.update.bind(drugsController),
)
router.delete('/:id',
  authorize(['SUPER_ADMIN']),
  drugsController.softDelete.bind(drugsController),
)

// Interactions
router.get ('/interactions/check',
  drugsController.checkInteraction.bind(drugsController),
)
router.post('/interactions',
  authorize(['SUPER_ADMIN','PHARMACIST']),
  drugsController.addInteraction.bind(drugsController),
)

// Batch recall (SUPER_ADMIN only)
router.post('/batches/:batchId/recall',
  authorize(['SUPER_ADMIN']),
  drugsController.recallBatch.bind(drugsController),
)

export default router