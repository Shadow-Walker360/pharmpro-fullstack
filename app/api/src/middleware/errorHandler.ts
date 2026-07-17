import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../lib/errors';
import { logger } from '../lib/logger';
import { env } from '../config/env';

/**
 * Must be registered LAST in app.ts, after every route:
 *   app.use(errorHandler);
 *
 * Distinguishes operational errors (ApiError — expected, safe to show the
 * client) from unexpected bugs (never leak stack traces in production).
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err, path: req.path }, 'Operational 5xx error');
    return res.status(err.statusCode).json({ error: err.name, message: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.issues.map((i) => `${i.path.join('.')} — ${i.message}`).join('; '),
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002 = unique constraint, P2025 = record not found — the two most
    // common ones worth translating into clean HTTP responses.
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({ error: 'CONFLICT', message: `A record with this ${fields} already exists` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Record not found' });
    }
    logger.error({ err, code: err.code, path: req.path }, 'Unhandled Prisma error');
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'A database error occurred' });
  }

  // Genuinely unexpected — log full detail server-side, never expose it.
  logger.error({ err, path: req.path }, 'Unhandled error');
  const message = env.NODE_ENV === 'production' ? 'An unexpected error occurred' : String((err as Error)?.message ?? err);
  return res.status(500).json({ error: 'INTERNAL_ERROR', message });
}