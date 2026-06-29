// ════════════════════════════════════════════════════════════
// apps/web/src/api/sales.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api }         from '../lib/api'
import { useCartStore }from '../store/cart.store'
import toast           from 'react-hot-toast'

const BASE = '/sales'

export function useSales(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['sales', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data),
    staleTime:30_000,
  })
}

export function useSale(id: string) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn:  () => api.get(`${BASE}/${id}`).then(r => r.data.data),
    enabled:  !!id,
  })
}

export function useSalesStats() {
  return useQuery({
    queryKey:        ['sales', 'stats'],
    queryFn:         () => api.get(`${BASE}/stats`).then(r => r.data.data),
    refetchInterval: 60_000, // refresh every minute
    staleTime:       30_000,
  })
}

export function useRevenueTrend(days: 7 | 30 = 7) {
  return useQuery({
    queryKey: ['sales', 'trend', days],
    queryFn:  () => api.get(`${BASE}/trend`, { params: { days } }).then(r => r.data.data),
    staleTime:300_000, // 5min — trend data changes slowly
  })
}

export function useCreateSale() {
  const qc    = useQueryClient()
  const clear = useCartStore(s => s.clear)

  return useMutation({
    mutationFn: (data: any) => api.post(BASE, data).then(r => r.data.data),
    onSuccess:  (result) => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      qc.invalidateQueries({ queryKey: ['sales', 'stats'] })
      clear()
      toast.success(`Sale ${result.saleNo} — KES ${result.total.toLocaleString('en-KE')}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Sale failed'),
  })
}

export function useInitiateMpesa() {
  return useMutation({
    mutationFn: (data: { phone: string; amount: number; saleRef?: string }) =>
      api.post(`${BASE}/mpesa/stk-push`, data).then(r => r.data.data),
    onSuccess: () => toast.success('M-Pesa prompt sent. Ask customer to enter PIN.'),
    onError:   (e: any) => toast.error(e?.response?.data?.message ?? 'M-Pesa failed'),
  })
}

export function useRefundSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(`${BASE}/refund`, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sales'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Refund processed. Stock returned to inventory.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Refund failed'),
  })
}


