'use client';

import useSWR from 'swr';

import { getContributionLeaderboard, getUserContributions } from '@/lib/api';
import type { Contribution, ContributionLeaderboardEntry } from '@/types';
import { useChain } from './useChain';

export const useContributionLeaderboard = (limit = 10) => {
  const { data, error, isLoading } = useSWR<ContributionLeaderboardEntry[]>(
    ['contribution-leaderboard', limit],
    () => getContributionLeaderboard(limit),
    { refreshInterval: 15000, dedupingInterval: 4000 }
  );

  return {
    leaderboard: data ?? [],
    isLoading,
    error
  };
};

export const useUserContributions = (address?: string) => {
  const { chain } = useChain();

  const { data, error, isLoading } = useSWR<Contribution[]>(
    address ? ['user-contributions', chain, address] : null,
    () => getUserContributions(address!, chain),
    { refreshInterval: 15000, dedupingInterval: 4000 }
  );

  return {
    contributions: data ?? [],
    isLoading,
    error
  };
};
