// ════════════════════════════════════════════════════════════
// apps/web/src/api/auth.api.ts
// ════════════════════════════════════════════════════════════
import { useMutation, useQuery } from '@tanstack/react-query'
import { api }                   from '../lib/api'
import { useAuthStore }          from '../store/auth.store'
import toast                     from 'react-hot-toast'
import { useNavigate }           from 'react-router-dom'

export function useLogin() {
  const { login }   = useAuthStore()
  const navigate    = useNavigate()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: () => {
      toast.success('Welcome back!')
      navigate('/dashboard')
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message ?? 'Invalid credentials')
    },
  })
}

export function useLogout() {
  const { logout } = useAuthStore()
  const navigate   = useNavigate()

  return useMutation({
    mutationFn: logout,
    onSuccess:  () => navigate('/login'),
  })
}

export function useMe() {
  const { isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn:  () => api.get('/auth/me').then(r => r.data.data),
    enabled:  isAuthenticated,
    staleTime:60_000,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', data),
    onSuccess: () => toast.success('Password changed. Please log in again.'),
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}


