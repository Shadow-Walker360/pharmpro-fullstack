// ════════════════════════════════════════════════════════════
// apps/web/src/lib/socket.ts
// Socket.io client — connects once, reconnects on drop.
// Services use the singleton exported here.
// ════════════════════════════════════════════════════════════
import { io, Socket }   from 'socket.io-client'
import { useAuthStore } from '../store/auth.store'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (socket?.connected) return socket

  const token = useAuthStore.getState().accessToken
  const URL   = import.meta.env.VITE_API_URL?.replace('/api', '') ?? ''

  socket = io(URL, {
    auth:       { token },
    transports: ['websocket', 'polling'],
    // Reconnection strategy — handles Kenya's variable connectivity
    reconnection:        true,
    reconnectionAttempts:Infinity,
    reconnectionDelay:   1000,
    reconnectionDelayMax:30000,
    randomizationFactor: 0.5,
  })

  socket.on('connect',              () => console.log('🟢 Socket connected'))
  socket.on('disconnect',   reason  => console.log('🔴 Socket disconnected:', reason))
  socket.on('connect_error', err    => console.warn('Socket error:', err.message))

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}


