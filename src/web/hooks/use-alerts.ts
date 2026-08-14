import type { Alert, PaginatedResponse } from '../../types';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '../api-client';

export interface AlertFilters {
  page?: number;
  pageSize?: number;
  status?: string;
  severity?: string;
  from?: string;
  to?: string;
}

export function useAlerts(filters: AlertFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);

  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => apiRequest<PaginatedResponse<Alert>>(`/api/v1/alerts?${params}`),
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      apiRequest<Alert>(`/api/v1/alerts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
}
