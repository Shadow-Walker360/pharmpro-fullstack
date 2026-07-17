import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../lib/logger';

/**
 * Singleton pattern — prevents exhausting the Postgres connection pool
 * from hot-reload creating a new PrismaClient on every file change in dev.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

if (env.NODE_ENV === 'development') {
  global.__prisma = prisma;

  // @ts-expect-error — event listener typing depends on the log config above
  prisma.$on('query', (e: { query: string; params: string; duration: number }) => {
    if (e.duration > 200) {
      // Slow query threshold — 200ms is generous for a till-side POS query;
      // tighten this once you have a baseline from real usage.
      logger.warn({ query: e.query, params: e.params, durationMs: e.duration }, 'Slow query detected');
    }
  });
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}