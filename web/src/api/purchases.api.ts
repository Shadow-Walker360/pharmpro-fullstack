// ════════════════════════════════════════════════════════════
// apps/web/src/api/purchases.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api }  from '../lib/api'
import toast    from 'react-hot-toast'

const BASE = '/purchases'

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn:  () => api.get(`${BASE}/suppliers`).then(r => r.data.data),
    staleTime:300_000,
  })
}

export function usePurchases(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data),
    staleTime:60_000,
  })
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: ['purchases', id],
    queryFn:  () => api.get(`${BASE}/${id}`).then(r => r.data.data),
    enabled:  !!id,
  })
}

export function usePurchaseStats() {
  return useQuery({
    queryKey: ['purchases', 'stats'],
    queryFn:  () => api.get(`${BASE}/stats`).then(r => r.data.data),
    staleTime:120_000,
  })
}

export function useCreatePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(BASE, data).then(r => r.data.data),
    onSuccess:  (po) => {
      qc.invalidateQueries({ queryKey: ['purchases'] })
      toast.success(`Purchase order ${po.poNumber} created`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}

export function useSendPurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`${BASE}/${id}/send`).then(r => r.data.data),
    onSuccess:  (_, id) => {
      qc.invalidateQueries({ queryKey: ['purchases', id] })
      qc.invalidateQueries({ queryKey: ['purchases'] })
      toast.success('Purchase order sent to supplier')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}

export function useReceivePurchase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.post(`${BASE}/${id}/receive`, data).then(r => r.data.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['purchases', id] })
      qc.invalidateQueries({ queryKey: ['purchases'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.success('Stock received and inventory updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}


