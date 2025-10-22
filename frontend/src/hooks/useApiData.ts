import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { apiFetch } from '@/lib/apiClient';
import { Challenge, DataEntry, RewardSummary, StakePosition } from '@/types/protocol';

interface ListResponse<T> {
  items: T[];
}

const isClient = typeof window !== 'undefined';

const formatError = (error: Error) => error.message || 'Unexpected error';

const getDefaultQueryOptions = <TQueryFnData,>() =>
  ({
    enabled: isClient,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    staleTime: 5_000,
    retry: 1
  }) satisfies Partial<UseQueryOptions<TQueryFnData, Error, TQueryFnData, readonly unknown[]>>;

function useErrorToast(error: Error | null, resource: string) {
  useEffect(() => {
    if (!error) return;
    toast.error(`Failed to load ${resource}: ${formatError(error)}`);
  }, [error, resource]);
}

export function useDatasets() {
  const query = useQuery<DataEntry[], Error>({
    queryKey: ['datasets'],
    queryFn: async () => {
      const response = await apiFetch<ListResponse<DataEntry>>('/data');
      return response.items;
    },
    ...getDefaultQueryOptions<DataEntry[]>(),
    refetchInterval: 15_000
  });

  useErrorToast(query.error ?? null, 'datasets');
  return query;
}

export function useStakes(address?: string) {
  const query = useQuery<StakePosition[], Error>({
    queryKey: ['stakes', address?.toLowerCase() ?? 'all'],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (address) {
        searchParams.set('address', address);
      }
      const response = await apiFetch<ListResponse<StakePosition>>(
        `/stake${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
      );
      return response.items;
    },
    ...getDefaultQueryOptions<StakePosition[]>(),
    refetchInterval: 15_000
  });

  useErrorToast(query.error ?? null, 'stake positions');
  return query;
}

export function useRewardSummary(address?: string) {
  const query = useQuery<RewardSummary, Error>({
    queryKey: ['rewardSummary', address?.toLowerCase() ?? 'network'],
    queryFn: () =>
      apiFetch<RewardSummary>(
        `/rewards${address ? `?address=${encodeURIComponent(address)}` : ''}`
      ),
    ...getDefaultQueryOptions<RewardSummary>(),
    refetchInterval: 15_000
  });

  useErrorToast(query.error ?? null, 'reward summary');
  return query;
}

export function useChallenges() {
  const query = useQuery<Challenge[], Error>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const response = await apiFetch<ListResponse<Challenge>>('/challenge');
      return response.items;
    },
    ...getDefaultQueryOptions<Challenge[]>(),
    refetchInterval: 20_000
  });

  useErrorToast(query.error ?? null, 'challenges');
  return query;
}
