// ════════════════════════════════════════════════════════════
// modules/inventory/inventory.router.ts
// ════════════════════════════════════════════════════════════

import { Router }               from 'express'
import { inventoryController }  from './inventory.controller'
import { authenticate }         from '../../middleware/authenticate'
import { authorize }            from '../../middleware/authorize'

const router = Router()
router.use(authenticate)

router.get  ('/',           inventoryController.list.bind(inventoryController))
router.get  ('/stats',      inventoryController.getStats.bind(inventoryController))
router.get  ('/low-stock',  inventoryController.getLowStock.bind(inventoryController))
router.get  ('/expiring',   inventoryController.getExpiring.bind(inventoryController))
router.get  ('/:drugId/ledger', inventoryController.getLedger.bind(inventoryController))

router.post ('/receive',
  authorize(['SUPER_ADMIN','PHARMACIST','STORE_MANAGER','TECHNICIAN']),
  inventoryController.receiveStock.bind(inventoryController),
)
router.post ('/adjust',
  authorize(['SUPER_ADMIN','PHARMACIST','STORE_MANAGER']),
  inventoryController.adjustStock.bind(inventoryController),
)

export default router