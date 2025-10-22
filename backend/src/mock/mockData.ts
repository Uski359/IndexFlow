import { randomUUID } from 'crypto';

import {
  Challenge,
  Dataset,
  RewardSummary,
  StakePosition,
  VerificationResult
} from '../types/protocol.js';

export const datasets: Dataset[] = [];

export const stakes: StakePosition[] = [];

export const verificationResults: VerificationResult[] = [];

export const rewardSummary: RewardSummary = {
  address: 'network',
  pending: 0,
  lifetime: 0,
  latestDistributions: []
};

export const challenges: Challenge[] = [];

export function addDataset(dataset: Dataset) {
  datasets.push(dataset);
  return dataset;
}

export function upsertStake(position: StakePosition) {
  const index = stakes.findIndex((stake) => stake.id === position.id);
  if (index >= 0) {
    stakes[index] = position;
  } else {
    stakes.push(position);
  }
  return position;
}

export function createStakeId() {
  return `stake-${randomUUID()}`;
}

export function createChallengeId() {
  return `challenge-${randomUUID()}`;
}

export function searchDatasetsLocally(query: string) {
  if (!query) {
    return datasets;
  }

  const lowered = query.toLowerCase();

  return datasets.filter((dataset) => {
    const haystacks = [
      dataset.metadata.name,
      dataset.metadata.description,
      dataset.metadata.tags.join(' '),
      dataset.hash
    ].join(' ');

    return haystacks.toLowerCase().includes(lowered);
  });
}
