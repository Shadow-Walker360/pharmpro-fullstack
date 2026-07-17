import { createBullMQConnection } from '../config/redis';

/**
 * BullMQ needs its own Redis connection per Queue/Worker (not the shared
 * app-wide `redis` client) — see the note in config/redis.ts. Each job
 * file below calls this to get its own connection rather than sharing one
 * across unrelated queues, which keeps one queue's backpressure from
 * affecting another's.
 */
export function getQueueConnection() {
  return createBullMQConnection();
}