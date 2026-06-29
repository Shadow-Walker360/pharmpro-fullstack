// ════════════════════════════════════════════════════════════
// apps/web/src/api/inventory.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api }  from '../lib/api'
import toast    from 'react-hot-toast'

const BASE = '/inventory'

export function useInventory(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data),
    staleTime:60_000,
  })
}

export function useInventoryStats() {
  return useQuery({
    queryKey:        ['inventory', 'stats'],
    queryFn:         () => api.get(`${BASE}/stats`).then(r => r.data.data),
    staleTime:       60_000,
    refetchInterval: 120_000,
  })
}

export function useLowStock() {
  return useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn:  () => api.get(`${BASE}/low-stock`).then(r => r.data.data),
    staleTime:120_000,
  })
}

export function useExpiringStock(days = 30) {
  return useQuery({
    queryKey: ['inventory', 'expiring', days],
    queryFn:  () => api.get(`${BASE}/expiring`, { params: { days } }).then(r => r.data.data),
    staleTime:300_000,
  })
}

export function useReceiveStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(`${BASE}/receive`, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Stock received and inventory updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Receive failed'),
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(`${BASE}/adjust`, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Stock adjusted successfully')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Adjustment failed'),
  })
}


