// ════════════════════════════════════════════════════════════
// realtime/socket.ts
// Socket.io — real-time updates to all branch clients.
// Architecture:
//   DB write → Redis pub/sub publish → Socket.io subscribes
//   → emits to all clients in that branch's room
// This decouples the HTTP layer from the WebSocket layer.
// ════════════════════════════════════════════════════════════

import { Server }       from 'socket.io'
import { createClient } from 'redis'
import { env }          from '../config/env'
import { logger }       from '../lib/logger'
import { verifyAccessToken } from '../lib/tokens'

// Separate Redis subscriber connection (can't reuse the main client)
const subscriber = createClient({ url: env.REDIS_URL })

export function initSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
    // Adaptive timeout for Kenya's variable connectivity
    pingTimeout:  60000,
    pingInterval: 25000,
    transports:   ['websocket', 'polling'], // polling fallback for weak connections
  })

  // ── Auth middleware for Socket.io ────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload     = verifyAccessToken(token)
      socket.data.user  = payload
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  // ── Connection handler ────────────────────────────────
  io.on('connection', (socket) => {
    const { sub: userId, branchId, role } = socket.data.user

    // Join branch-specific room — all events scoped to branch
    socket.join(`branch:${branchId}`)
    logger.info({ userId, branchId, role }, 'Socket connected')

    socket.on('disconnect', (reason) => {
      logger.info({ userId, reason }, 'Socket disconnected')
    })
  })

  // ── Redis → Socket bridge ─────────────────────────────
  // Subscribe to all branch event channels.
  // Services publish to Redis; Socket.io broadcasts to clients.
  subscriber.connect().then(async () => {
    await subscriber.pSubscribe('branch:*:events', (message, channel) => {
      try {
        const data     = JSON.parse(message)
        const branchId = channel.split(':')[1]
        // Broadcast to all clients in this branch's room
        io.to(`branch:${branchId}`).emit(data.event, data)
      } catch (e) {
        logger.error({ e, channel }, 'Socket bridge parse error')
      }
    })
    logger.info('✅ Socket.io Redis bridge active')
  })

  return io
}


