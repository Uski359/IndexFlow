'use client';

import { useQuery } from '@tanstack/react-query';

import { safeApiFetch } from '@/lib/apiClient';

interface ProtocolHealth {
  status: string;
  timestamp: string;
}

const isClient = typeof window !== 'undefined';

export function useProtocolHealth() {
  return useQuery({
    queryKey: ['protocol-health'],
    queryFn: () =>
      safeApiFetch<ProtocolHealth>('/health', {
        status: 'unknown',
        timestamp: new Date().toISOString()
      }),
    enabled: isClient,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    initialData: {
      status: 'unknown',
      timestamp: new Date().toISOString()
    }
  });
}
