// ════════════════════════════════════════════════════════════
// apps/web/src/lib/api.ts
// Axios instance — attaches JWT, handles 401 refresh flow,
// retries once with fresh token before failing.
// ════════════════════════════════════════════════════════════
import axios from 'axios'

import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios'
import { useAuthStore }   from '../store/auth.store'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export const api: AxiosInstance = axios.create({
  baseURL:         BASE,
  withCredentials: true,          // send refresh token cookie
  timeout:         15_000,
  headers:         { 'Content-Type': 'application/json' },
})

// ── Request interceptor: attach access token ──────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 with token refresh ──
let isRefreshing   = false
let failedQueue:   { resolve: (t: string) => void; reject: (e: any) => void }[] = []

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token!))
  failedQueue = []
}

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then(token => {
        original.headers!.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing    = true

    try {
      // Cookie-based refresh — no body needed
      const res   = await axios.post(`${BASE}/auth/refresh`, {}, { withCredentials: true })
      const token = res.data.accessToken
      useAuthStore.getState().setAccessToken(token)
      processQueue(null, token)
      original.headers!.Authorization = `Bearer ${token}`
      return api(original)
    } catch (err) {
      processQueue(err, null)
      useAuthStore.getState().logout()
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)


