import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env } from './config/env';
import { logger } from './lib/logger';
import { generalRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Routers — every module built across this project
import authRouter from './modules/auth/auth.router';
import patientsRouter from './modules/patients/patients.router';
import drugsRouter from './modules/drugs/drugs.router';
import inventoryRouter from './modules/inventory/inventory.router';
import prescriptionsRouter from './modules/prescriptions/prescriptions.router';
import salesRouter from './modules/sales/sales.router';
import financeRouter from './modules/finance/finance.router';
import insuranceRouter from './modules/insurance/insurance.controller';
import purchasesRouter from './modules/purchases/purchases.router';
import auditRouter from './modules/audit/audit.module';
import reportsRouter from './modules/reports/reports.module';
import staffRouter from './modules/staff/staff.module';
import settingsRouter from './modules/settings/settings.module';

// Attachment routes are mounted nested under prescriptions — see below
import attachmentRouter from './lib/attachments.router';

export function createApp(): Express {
  const app = express();

  // ── Security & parsing — order matters ──────────────────────────────
  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // required for the HttpOnly refresh-token cookie
  }));
  app.use(express.json({ limit: '2mb' })); // prescriptions/receipts payloads; raised from Express's 100kb default
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  // General rate limit applies to everything; auth.router applies its own
  // stricter loginRateLimiter on top of this for the /login route specifically.
  app.use(generalRateLimiter);

  // ── Health check — no auth, used by Docker/load balancer ────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── Routes ───────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/drugs', drugsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/prescriptions', prescriptionsRouter);
  app.use('/api/prescriptions/:prescriptionId/attachments', attachmentRouter);
  app.use('/api/sales', salesRouter);
  app.use('/api/finance', financeRouter);
  app.use('/api/insurance', insuranceRouter);
  app.use('/api/purchases', purchasesRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/staff', staffRouter);
  app.use('/api/settings', settingsRouter);

  // ── 404 for unmatched API routes ────────────────────────────────────
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` });
  });

  // ── Global error handler — MUST be last ─────────────────────────────
  app.use(errorHandler);

  return app;
}