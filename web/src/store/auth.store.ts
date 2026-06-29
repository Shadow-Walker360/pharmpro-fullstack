// ════════════════════════════════════════════════════════════
// apps/web/src/store/auth.store.ts
// Zustand — persisted auth state with session hydration
// ════════════════════════════════════════════════════════════
import { create }     from 'zustand'
import { persist }    from 'zustand/middleware'
import { api }        from '../lib/api'
import { disconnectSocket } from '../lib/socket'

export interface AuthUser {
  id:        string
  firstName: string
  lastName:  string
  email:     string
  role:      string
  branchId:  string
  branch:    { id: string; name: string }
}

interface AuthState {
  accessToken:    string | null
  user:           AuthUser | null
  isAuthenticated:boolean
  isLoading:      boolean
  setAccessToken: (t: string) => void
  login:          (email: string, password: string) => Promise<void>
  logout:         () => Promise<void>
  hydrate:        () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken:     null,
      user:            null,
      isAuthenticated: false,
      isLoading:       false,

      setAccessToken: (accessToken) => set({ accessToken }),

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/login', { email, password })
          set({
            accessToken:     res.data.accessToken,
            user:            res.data.user,
            isAuthenticated: true,
            isLoading:       false,
          })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch {}
        disconnectSocket()
        set({ accessToken: null, user: null, isAuthenticated: false })
      },

      // Called on app mount — refreshes token if cookie still valid
      hydrate: async () => {
        set({ isLoading: true })
        try {
          const res = await api.post('/auth/refresh')
          set({ accessToken: res.data.accessToken })
          const me = await api.get('/auth/me')
          set({ user: me.data.data, isAuthenticated: true })
        } catch {
          set({ accessToken: null, user: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name:    'pharmpro-auth',
      partialize: (s) => ({ user: s.user }), // only persist user, NOT token
    },
  ),
)





