// ════════════════════════════════════════════════════════════
// apps/web/src/api/drugs.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api }  from '../lib/api'
import toast    from 'react-hot-toast'

const BASE = '/drugs'

export function useDrugs(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['drugs', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data),
    staleTime:300_000, // drugs change rarely
  })
}

export function useDrug(id: string) {
  return useQuery({
    queryKey: ['drugs', id],
    queryFn:  () => api.get(`${BASE}/${id}`).then(r => r.data.data),
    enabled:  !!id,
    staleTime:300_000,
  })
}

export function useCheckInteraction(drugAId?: string, drugBId?: string) {
  return useQuery({
    queryKey: ['drugs', 'interaction', drugAId, drugBId],
    queryFn:  () =>
      api.get(`${BASE}/interactions/check`, { params: { drugAId, drugBId } })
        .then(r => r.data.data),
    enabled:  !!drugAId && !!drugBId,
    staleTime:300_000,
  })
}

export function useCreateDrug() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(BASE, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
      toast.success('Drug added to database')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}

export function useRecallBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, reason }: { batchId: string; reason: string }) =>
      api.post(`${BASE}/batches/${batchId}/recall`, { reason }).then(r => r.data.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['drugs'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
      toast.error(
        `Batch recalled. ${data.affectedPatients?.length ?? 0} patients affected.`,
        { duration: 10000 },
      )
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Recall failed'),
  })
}


