import axios, { AxiosInstance } from 'axios';

import type {
  ActivityStats,
  Contribution,
  ContributionLeaderboardEntry,
  GlobalStakingStats,
  HolderCount,
  IndexerHealth,
  Proof,
  StakingUser,
  SupplyStat,
  ThroughputStats,
  Transfer
} from '@/types';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

const baseURL =
  (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '') || 'http://localhost:4000/api';

const client: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000
});

const withChain = (chain?: string, extra?: Record<string, unknown>) => {
  const params: Record<string, unknown> = { ...(extra ?? {}) };
  if (chain) {
    params.chain = chain;
  }
  return Object.keys(params).length ? { params } : undefined;
};

export const getLatestTransfers = async (chain?: string): Promise<Transfer[]> => {
  const res = await client.get<ApiResponse<Transfer[]>>('/transfers/latest', withChain(chain));
  return res.data.data;
};

export const getTransfersByAddress = async (
  address: string,
  chain?: string
): Promise<Transfer[]> => {
  const res = await client.get<ApiResponse<Transfer[]>>(
    `/transfers/${address}`,
    withChain(chain)
  );
  return res.data.data;
};

export const getHolderCount = async (chain?: string): Promise<HolderCount> => {
  const res = await client.get<ApiResponse<HolderCount>>('/stats/holders', withChain(chain));
  return res.data.data;
};

export const getSupply = async (chain?: string): Promise<SupplyStat> => {
  const res = await client.get<ApiResponse<SupplyStat>>('/stats/supply', withChain(chain));
  return res.data.data;
};

export const getActivityStats = async (chain?: string): Promise<ActivityStats> => {
  const res = await client.get<ApiResponse<ActivityStats>>('/stats/activity', withChain(chain));
  return res.data.data;
};

export const getThroughputStats = async (chain?: string): Promise<ThroughputStats> => {
  const res = await client.get<ApiResponse<ThroughputStats>>('/stats/throughput', withChain(chain));
  return res.data.data;
};

export const getIndexerHealth = async (chain?: string): Promise<IndexerHealth> => {
  const res = await client.get<ApiResponse<IndexerHealth>>('/health', withChain(chain));
  return res.data.data;
};

export const getGlobalStaking = async (chain?: string): Promise<GlobalStakingStats> => {
  const res = await client.get<ApiResponse<GlobalStakingStats>>('/staking/global', withChain(chain));
  return res.data.data;
};

export const getUserStaking = async (address: string, chain?: string): Promise<StakingUser> => {
  const res = await client.get<ApiResponse<StakingUser>>(
    `/staking/user/${address}`,
    withChain(chain)
  );
  return res.data.data;
};

export const getRecentProofs = async (chain?: string): Promise<Proof[]> => {
  const res = await client.get<ApiResponse<Proof[]>>('/poi/recent', withChain(chain));
  return res.data.data;
};

export const getOperatorProofs = async (address: string, chain?: string): Promise<Proof[]> => {
  const res = await client.get<ApiResponse<Proof[]>>(
    `/poi/operator/${address}`,
    withChain(chain)
  );
  return res.data.data;
};

export const getContributionLeaderboard = async (
  limit = 10
): Promise<ContributionLeaderboardEntry[]> => {
  const res = await client.get<ApiResponse<ContributionLeaderboardEntry[]>>(
    '/contributions/leaderboard',
    { params: { limit } }
  );
  return res.data.data;
};

export const getUserContributions = async (
  address: string,
  chain?: string
): Promise<Contribution[]> => {
  const res = await client.get<ApiResponse<Contribution[]>>(
    `/contributions/user/${address}`,
    withChain(chain)
  );
  return res.data.data;
};
