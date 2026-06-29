// ════════════════════════════════════════════════════════════
// apps/web/src/api/reports.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation } from '@tanstack/react-query'
import { api }   from '../lib/api'
import toast     from 'react-hot-toast'

const BASE = '/reports'

export function useReport(params: {
  type:   string
  from:   string
  to:     string
  format?:string
}) {
  return useQuery({
    queryKey: ['reports', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data.data),
    enabled:  !!params.type && !!params.from && !!params.to,
    staleTime:600_000,
  })
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: (params: any) =>
      api.get(BASE, { params }).then(r => r.data.data),
    onSuccess: (data) => {
      if (data.queued) {
        toast.success('PDF report queued. Download will be ready shortly.')
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Report failed'),
  })
}