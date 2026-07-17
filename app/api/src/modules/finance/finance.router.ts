//════════════════════════════════════════════════════════════
// modules/finance/finance.router.ts
// ════════════════════════════════════════════════════════════
import { Router }           from 'express'
import { financeController} from './finance.controller'
import { authenticate }     from '../../middleware/authenticate'
import { authorize }        from '../../middleware/authorize'

const router = Router()
router.use(authenticate)
router.use(authorize(['SUPER_ADMIN','PHARMACIST','ACCOUNTANT','STORE_MANAGER']))

router.get ('/pl',                financeController.getProfitAndLoss.bind(financeController))
router.get ('/drugs',             financeController.getDrugProfitability.bind(financeController))
router.get ('/daily',             financeController.getDailyRevenue.bind(financeController))
router.get ('/inventory-value',   financeController.getInventoryValuation.bind(financeController))
router.get ('/payments',          financeController.getPaymentBreakdown.bind(financeController))
router.get ('/expenses',          financeController.listExpenses.bind(financeController))
router.post('/expenses',
  authorize(['SUPER_ADMIN','ACCOUNTANT','STORE_MANAGER']),
  financeController.createExpense.bind(financeController),
)

export default router