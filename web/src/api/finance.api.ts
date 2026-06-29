// ════════════════════════════════════════════════════════════
// apps/web/src/api/finance.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api }  from '../lib/api'
import toast    from 'react-hot-toast'

const BASE = '/finance'

export function useProfitAndLoss(from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'pl', from, to],
    queryFn:  () => api.get(`${BASE}/pl`, { params: { from, to } }).then(r => r.data.data),
    enabled:  !!from && !!to,
    staleTime:600_000,
  })
}

export function useDrugProfitability(from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'drugs', from, to],
    queryFn:  () => api.get(`${BASE}/drugs`, { params: { from, to } }).then(r => r.data.data),
    enabled:  !!from && !!to,
    staleTime:600_000,
  })
}

export function useDailyRevenue(from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'daily', from, to],
    queryFn:  () => api.get(`${BASE}/daily`, { params: { from, to } }).then(r => r.data.data),
    enabled:  !!from && !!to,
    staleTime:300_000,
  })
}

export function useInventoryValuation() {
  return useQuery({
    queryKey: ['finance', 'inv-val'],
    queryFn:  () => api.get(`${BASE}/inventory-value`).then(r => r.data.data),
    staleTime:300_000,
  })
}

export function usePaymentBreakdown(from: string, to: string) {
  return useQuery({
    queryKey: ['finance', 'payments', from, to],
    queryFn:  () => api.get(`${BASE}/payments`, { params: { from, to } }).then(r => r.data.data),
    enabled:  !!from && !!to,
    staleTime:300_000,
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(`${BASE}/expenses`, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Expense recorded')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}


