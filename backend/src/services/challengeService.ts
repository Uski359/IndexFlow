import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';

import { fetchChallenges, insertChallenge } from '../repositories/challengeRepository.js';
import { getDatasetById, updateDataset } from '../repositories/datasetRepository.js';
import { Challenge } from '../types/protocol.js';
import { createNotFoundError } from '../utils/httpError.js';

interface ChallengeInput {
  entryId: string;
  challenger: string;
  reason: string;
  bond: number;
}

export async function listChallenges() {
  return fetchChallenges();
}

export async function createChallenge(input: ChallengeInput): Promise<Challenge> {
  const dataset = await getDatasetById(input.entryId);
  if (!dataset) {
    throw createNotFoundError('Dataset', input.entryId);
  }
  if (dataset.status === 'rejected') {
    throw createHttpError(409, 'Cannot challenge a rejected dataset');
  }

  const challenge: Challenge = {
    id: `challenge-${randomUUID()}`,
    entryId: input.entryId,
    challenger: input.challenger.toLowerCase(),
    reason: input.reason,
    bond: input.bond,
    status: 'pending',
    openedAt: new Date().toISOString()
  };

  await updateDataset(dataset.id, {
    status: 'challenged',
    updatedAt: challenge.openedAt
  });

  return insertChallenge(challenge);
}
