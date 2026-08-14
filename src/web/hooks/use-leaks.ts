import type { EnrichmentResult, LeakRecord, PaginatedResponse } from '../../types';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../api-client';

export interface LeakFilters {
  page?: number;
  pageSize?: number;
  severity?: string;
  source?: string;
  from?: string;
  to?: string;
  q?: string;
}

export function useLeaks(filters: LeakFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.source) params.set('source', filters.source);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.q) params.set('q', filters.q);

  return useQuery({
    queryKey: ['leaks', filters],
    queryFn: () => apiRequest<PaginatedResponse<LeakRecord>>(`/api/v1/leaks?${params}`),
  });
}

export function useLeak(id: string) {
  return useQuery({
    queryKey: ['leaks', id],
    queryFn: () =>
      apiRequest<LeakRecord & { enrichment?: EnrichmentResult }>(`/api/v1/leaks/${id}`),
    enabled: Boolean(id),
  });
}

export function useEnrichLeak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<EnrichmentResult>(`/api/v1/leaks/${id}/enrich`, { method: 'POST' }),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['leaks', id] });
    },
  });
}
