import { defaultProofOfUsageCriteria, type ProofOfUsageCriteria } from './criteria.js';

export type ProofOfUsageResult = {
  eligible: boolean;
  metadata: {
    walletAddress: string;
    timeframeDays: number;
    minimumInteractions: number;
    observedInteractions: number;
    sourceQueryIdentifiers: string[];
  };
};

const RECENT_INTERACTIONS_QUERY_ID = 'core:queries:recentInteractions';

const fetchRecentInteractionCount = async (
  walletAddress: string,
  timeframeDays: number
): Promise<{ count: number; sourceId: string }> => {
  // TODO: Replace with the core's read-only query once it is exposed for usage checks.
  // This placeholder avoids any writes or side effects and keeps the adapter self-contained.
  return {
    count: 0,
    sourceId: RECENT_INTERACTIONS_QUERY_ID
  };
};

export const evaluateProofOfUsage = async (
  walletAddress: string,
  criteria: ProofOfUsageCriteria = defaultProofOfUsageCriteria
): Promise<ProofOfUsageResult> => {
  const normalizedWallet = walletAddress.toLowerCase();
  const { timeframeDays, minimumInteractions } = criteria;

  const { count, sourceId } = await fetchRecentInteractionCount(normalizedWallet, timeframeDays);
  const eligible = count >= minimumInteractions;

  return {
    eligible,
    metadata: {
      walletAddress: normalizedWallet,
      timeframeDays,
      minimumInteractions,
      observedInteractions: count,
      sourceQueryIdentifiers: [sourceId]
    }
  };
};
