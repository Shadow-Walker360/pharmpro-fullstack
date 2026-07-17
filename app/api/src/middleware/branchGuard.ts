import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { ApiError } from '../lib/errors';

/**
 * Stamps req.branchId (and req.branchCode) from the authenticated user's
 * JWT/DB record — services must NEVER trust a branchId passed in the
 * request body or query string. Every query in every service filters by
 * req.branchId, which this middleware is the single source of truth for.
 *
 * Must run after `authenticate` (needs req.user.branchId already set).
 *
 * Also backs PostgreSQL Row-Level Security: if RLS policies are enabled
 * on branch-scoped tables, this is the natural place to SET the session
 * variable Postgres RLS reads, e.g.:
 *   await prisma.$executeRaw`SET app.current_branch_id = ${req.branchId}`;
 * (left commented below — enable once RLS policies are actually written).
 */
export async function branchGuard(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('branchGuard requires authenticate to run first');
    }

    req.branchId = req.user.branchId;

    // branchCode (e.g. "ELD" for Eldoret) is used for human-readable IDs
    // like RX-2026-ELD-000001 / CLM-2026-ELD-000001. Cached in Redis since
    // it changes essentially never and this middleware runs on every request.
    const cacheKey = `branch-code:${req.branchId}`;
    let branchCode = await redis.get(cacheKey);

    if (!branchCode) {
      const branch = await prisma.branch.findUnique({
        where: { id: req.branchId },
        select: { code: true },
      });
      if (!branch) throw ApiError.notFound('Branch associated with this account no longer exists');
      branchCode = branch.code;
      await redis.set(cacheKey, branchCode, 'EX', 3600);
    }

    req.branchCode = branchCode;

    // await prisma.$executeRaw`SET app.current_branch_id = ${req.branchId}`;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional stricter guard for routes where a resource ID is in the URL
 * (e.g. /api/patients/:id) and you want to reject before even hitting the
 * service layer if it belongs to a different branch. Most modules already
 * do this inline via `findFirst({ where: { id, branchId } })`, which is
 * usually sufficient — use this only where you want the 404 to happen
 * earlier, before any other logic runs.
 */
export function assertSameBranch(resourceBranchId: string, req: Request) {
  if (resourceBranchId !== req.branchId) {
    throw ApiError.notFound('Resource not found'); // 404, not 403 — don't reveal cross-branch existence
  }
}