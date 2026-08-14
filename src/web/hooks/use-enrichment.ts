import type { EnrichmentResult } from '../../types';

import { useMutation } from '@tanstack/react-query';

import { apiRequest } from '../api-client';

export function useEnrich() {
  return useMutation({
    mutationFn: ({ type, value }: { type: 'ip' | 'domain' | 'hash'; value: string }) =>
      apiRequest<EnrichmentResult>('/api/v1/enrich', {
        method: 'POST',
        body: JSON.stringify({ type, value }),
      }),
  });
}
