/ ════════════════════════════════════════════════════════════
// FINAL app.ts — all 11 routers registered
// ════════════════════════════════════════════════════════════
import express            from 'express'
import cors               from 'cors'
import helmet             from 'helmet'
import cookieParser       from 'cookie-parser'
import { env }            from './config/env'
import { apiLimiter }     from './middleware/rateLimiter'
import { branchGuard }    from './middleware/branchGuard'
import { errorHandler }   from './middleware/errorHandler'
import { authenticate }   from './middleware/authenticate'
import authRouter         from './modules/auth/auth.router'
import patientsRouter     from './modules/patients/patients.router'
import drugsRouter        from './modules/drugs/drugs.router'
import inventoryRouter    from './modules/inventory/inventory.router'
import prescriptionsRouter from './modules/prescriptions/prescriptions.router'
import salesRouter        from './modules/sales/sales.router'
import purchasesRouter    from './modules/purchases/purchases.router'
import financeRouter      from './modules/finance/finance.router'
import insuranceRouter    from './modules/insurance/insurance.router'
import { auditRouter }    from './modules/audit/audit.service'
import { reportsRouter }  from './modules/reports/reports.service'

const app = express()
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(apiLimiter)
app.use(authenticate)
app.use(branchGuard)

app.get('/health', (_req, res) => res.json({
  status:    'ok',
  service:   'pharmpro-api',
  version:   '1.0.0',
  timestamp: new Date().toISOString(),
}))

// ── All 11 domain routers ─────────────────────────────────
app.use('/api/auth',          authRouter)
app.use('/api/patients',      patientsRouter)
app.use('/api/drugs',         drugsRouter)
app.use('/api/inventory',     inventoryRouter)
app.use('/api/prescriptions', prescriptionsRouter)
app.use('/api/sales',         salesRouter)
app.use('/api/purchases',     purchasesRouter)
app.use('/api/finance',       financeRouter)
app.use('/api/insurance',     insuranceRouter)
app.use('/api/audit',         auditRouter)
app.use('/api/reports',       reportsRouter)

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }))
app.use(errorHandler)

export default app