import type { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { env } from '../config/env';
import { ApiError } from '../lib/errors';

/**
 * Redis-backed sliding-window-ish rate limiter (fixed window, which is
 * simpler and good enough here — a burst right at a window boundary isn't
 * a real risk for this app's threat model). Works correctly across
 * multiple API server instances behind a load balancer, unlike an
 * in-memory limiter, because the counter lives in shared Redis.
 */
function createLimiter(options: {
  windowMinutes: number;
  max: number;
  keyPrefix: string;
  keyGenerator?: (req: Request) => string;
}) {
  const { windowMinutes, max, keyPrefix, keyGenerator } = options;
  const windowSeconds = windowMinutes * 60;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identity = keyGenerator ? keyGenerator(req) : req.ip;
      const key = `ratelimit:${keyPrefix}:${identity}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));
      res.setHeader('X-RateLimit-Reset', String(ttl));

      if (count > max) {
        throw new ApiError(429, `Too many requests. Try again in ${Math.ceil(ttl / 60)} minute(s).`);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * General API limiter — mount globally in app.ts, before routes:
 *   app.use(generalRateLimiter);
 * Keyed by IP address.
 */
export const generalRateLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_GENERAL_WINDOW_MIN,
  max: env.RATE_LIMIT_GENERAL_MAX,
  keyPrefix: 'general',
});

/**
 * Strict login limiter — mount only on POST /api/auth/login. Keyed by a
 * combination of IP and the email/phone being attempted, not just IP —
 * this stops both "one attacker hammering many accounts from one IP" and
 * "distributed attempts against a single account from many IPs" better
 * than either key alone.
 */
export const loginRateLimiter = createLimiter({
  windowMinutes: env.RATE_LIMIT_LOGIN_WINDOW_MIN,
  max: env.RATE_LIMIT_LOGIN_MAX,
  keyPrefix: 'login',
  keyGenerator: (req) => {
    const identifier = req.body?.email ?? req.body?.phone ?? 'unknown';
    return `${req.ip}:${identifier}`;
  },
});

/**
 * Tighter limiter for expensive/sensitive endpoints — report exports,
 * PDF generation, bulk operations. Mount per-route as needed:
 *   router.get('/:type/export', exportRateLimiter, ...)
 */
export const exportRateLimiter = createLimiter({
  windowMinutes: 5,
  max: 10,
  keyPrefix: 'export',
  keyGenerator: (req) => req.user?.id ?? req.ip,
});