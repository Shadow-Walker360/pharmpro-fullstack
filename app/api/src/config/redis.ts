import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../lib/logger';

/**
 * Single Redis connection shared by: session/token blacklist, rate
 * limiting, dashboard/report caching, M-Pesa STK pending state, and as
 * the BullMQ connection (BullMQ needs its own connection instances per
 * queue/worker in practice — see note at the bottom — but this is the
 * one used directly for get/set/incr throughout the app).
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 200, 2000),
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error({ err }, 'Redis connection error'));

export async function disconnectRedis() {
  await redis.quit();
}

/**
 * BullMQ requires connections with maxRetriesPerRequest: null (it manages
 * its own retry/blocking semantics). Reusing the app's general-purpose
 * redis client above for queues can cause BullMQ to silently misbehave —
 * always create dedicated connections for queues/workers using this factory.
 */
export function createBullMQConnection() {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}