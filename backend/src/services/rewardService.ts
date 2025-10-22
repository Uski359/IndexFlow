import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';

import { getDatasetById } from '../repositories/datasetRepository.js';
import {
  fetchRecentRewardEvents,
  insertRewardEvent,
  sumRewardEvents
} from '../repositories/rewardRepository.js';
import { clearRewardsForAddress, sumRewards } from '../repositories/stakeRepository.js';
import { RewardEvent } from '../types/protocol.js';
import { createNotFoundError } from '../utils/httpError.js';

interface RewardSummary {
  address: string;
  pending: number;
  lifetime: number;
  latestDistributions: Array<{
    datasetId: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface RewardDistributionInput {
  datasetId: string;
  recipient: string;
  amount: number;
  timestamp?: string;
}

export async function recordRewardDistribution(
  input: RewardDistributionInput
): Promise<RewardEvent> {
  const dataset = await getDatasetById(input.datasetId);
  if (!dataset) {
    throw createNotFoundError('Dataset', input.datasetId);
  }
  if (dataset.status !== 'indexed') {
    throw createHttpError(409, 'Dataset must be indexed before rewards are disbursed');
  }

  const event: RewardEvent = {
    id: `reward-${randomUUID()}`,
    datasetId: input.datasetId,
    recipient: input.recipient.toLowerCase(),
    amount: input.amount,
    createdAt: input.timestamp ?? new Date().toISOString()
  };

  return insertRewardEvent(event);
}

export async function recordRewardClaim(address: string): Promise<RewardSummary> {
  const normalized = address.toLowerCase();
  await clearRewardsForAddress(normalized);
  return getRewardSummary(normalized);
}

export async function getRewardSummary(address?: string): Promise<RewardSummary> {
  const normalizedAddress = address?.toLowerCase();

  const [pending, lifetime, recentEvents] = await Promise.all([
    sumRewards(normalizedAddress),
    sumRewardEvents(normalizedAddress),
    fetchRecentRewardEvents(normalizedAddress)
  ]);

  return {
    address: normalizedAddress ?? 'network',
    pending,
    lifetime,
    latestDistributions: recentEvents.map((event) => ({
      datasetId: event.datasetId,
      amount: event.amount,
      timestamp: event.createdAt
    }))
  };
}
