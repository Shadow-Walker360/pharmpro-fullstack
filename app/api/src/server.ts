import 'dotenv/config';

import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { disconnectPrisma } from './config/prisma';
import { disconnectRedis, redis } from './config/redis';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);

  // Socket.io — rooms per branch, fed via Redis pub/sub so this scales
  // across multiple API instances (see sales.service.ts notes from Step 6).
  const io = new SocketIOServer(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });

  const subClient = redis.duplicate();
  await subClient.subscribe('branch-events');
  subClient.on('message', (_channel, message) => {
    try {
      const { branchId, event, payload } = JSON.parse(message);
      io.to(`branch:${branchId}`).emit(event, payload);
    } catch (err) {
      logger.error({ err }, 'Failed to process branch-events pub/sub message');
    }
  });

  io.on('connection', (socket) => {
    const branchId = socket.handshake.auth?.branchId;
    if (branchId) socket.join(`branch:${branchId}`);
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`PharmPro API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectPrisma();
      await disconnectRedis();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    // Force-exit if graceful shutdown hangs for more than 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});