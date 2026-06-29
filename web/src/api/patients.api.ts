// ════════════════════════════════════════════════════════════
// apps/web/src/api/patients.api.ts
// ════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api }   from '../lib/api'
import toast     from 'react-hot-toast'

const BASE = '/patients'

export function usePatients(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn:  () => api.get(BASE, { params }).then(r => r.data),
    staleTime:30_000,
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patients', id],
    queryFn:  () => api.get(`${BASE}/${id}`).then(r => r.data.data),
    enabled:  !!id,
  })
}

export function usePatientStats() {
  return useQuery({
    queryKey: ['patients', 'stats'],
    queryFn:  () => api.get(`${BASE}/stats`).then(r => r.data.data),
    staleTime:60_000,
  })
}

export function useRefillsDue() {
  return useQuery({
    queryKey: ['patients', 'refills-due'],
    queryFn:  () => api.get(`${BASE}/refills-due`).then(r => r.data.data),
    staleTime:60_000,
  })
}

export function useCreatePatient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.post(BASE, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Patient registered successfully')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Registration failed'),
  })
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => api.patch(`${BASE}/${id}`, data).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['patients', id] })
      qc.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Patient record updated')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  })
}

export function useAddAllergy(patientId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) =>
      api.post(`${BASE}/${patientId}/allergies`, data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients', patientId] })
      toast.success('Allergy recorded')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
}


