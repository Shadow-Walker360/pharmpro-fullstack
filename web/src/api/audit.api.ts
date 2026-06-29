// ════════════════════════════════════════════════════════════
// apps/web/src/api/audit.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query'
import { api }      from '../lib/api'

const BASE = '/audit'

export function useAuditLogs(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['audit', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data),
    staleTime:30_000,
  })
}

export function useAuditSummary() {
  return useQuery({
    queryKey:        ['audit', 'summary'],
    queryFn:         () => api.get(`${BASE}/summary`).then(r => r.data.data),
    refetchInterval: 60_000,
    staleTime:       30_000,
  })
}

export function useReadAuditLog(patientId?: string) {
  return useQuery({
    queryKey: ['audit', 'reads', patientId],
    queryFn:  () =>
      api.get(`${BASE}/reads`, { params: patientId ? { patientId } : {} })
        .then(r => r.data.data),
    staleTime:60_000,
  })
}

export function useControlledLog() {
  return useQuery({
    queryKey: ['audit', 'controlled'],
    queryFn:  () => api.get(`${BASE}/controlled`).then(r => r.data.data),
    staleTime:60_000,
  })
}


