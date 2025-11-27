'use client';

import useSWR from 'swr';

import { getLatestTransfers, getTransfersByAddress } from '@/lib/api';
import type { Transfer } from '@/types';

import { useChain } from './useChain';

type UseTransfersOptions = {
  address?: string;
  limit?: number;
};

export const useTransfers = (options?: UseTransfersOptions) => {
  const { chain } = useChain();
  const address = options?.address;

  const { data, error, isLoading, mutate } = useSWR<Transfer[]>(
    ['transfers', chain, address],
    () =>
      address ? getTransfersByAddress(address, chain) : getLatestTransfers(chain),
    {
      refreshInterval: 10000,
      dedupingInterval: 2000
    }
  );

  const trimmed = options?.limit && data ? data.slice(0, options.limit) : data;

  return {
    transfers: trimmed ?? [],
    isLoading,
    error,
    mutate
  };
};
