import { defaultProofOfUsageCriteria, type ProofOfUsageCriteria } from './criteria.js';

export type ProofOfUsageResult = {
  eligible: boolean;
  metadata: {
    walletAddress: string;
    timeframeDays: number;
    minimumInteractions: number;
    minimumActiveDays: number;
    observedInteractions: number;
    activeDays: number;
    reason: string;
    sourceQueryIdentifiers: string[];
  };
};

const RECENT_INTERACTIONS_QUERY_ID = 'core:queries:recentInteractions';

const resolveNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const interactionsLabel = (value: number) => (value === 1 ? 'interaction' : 'interactions');
const daysLabel = (value: number) => (value === 1 ? 'day' : 'days');

const fetchRecentInteractions = async (
  walletAddress: string,
  timeframeDays: number
): Promise<{ count: number; activeDays: number; sourceId: string }> => {
  // TODO: Replace with the core's read-only query once it is exposed for usage checks.
  // This placeholder avoids any writes or side effects and keeps the adapter self-contained.
  return {
    count: 0,
    activeDays: 0,
    sourceId: RECENT_INTERACTIONS_QUERY_ID
  };
};

export const evaluateProofOfUsage = async (
  walletAddress: string,
  criteria: Partial<ProofOfUsageCriteria> = defaultProofOfUsageCriteria
): Promise<ProofOfUsageResult> => {
  const normalizedWallet = walletAddress.trim().toLowerCase();
  const timeframeDays = resolveNumber(
    criteria.timeframeDays,
    defaultProofOfUsageCriteria.timeframeDays
  );
  const minimumInteractions = resolveNumber(
    criteria.minimumInteractions,
    defaultProofOfUsageCriteria.minimumInteractions
  );
  const minimumActiveDays = resolveNumber(
    criteria.minimumActiveDays,
    defaultProofOfUsageCriteria.minimumActiveDays
  );

  const { count, activeDays, sourceId } = await fetchRecentInteractions(
    normalizedWallet,
    timeframeDays
  );
  const eligible = count >= minimumInteractions && activeDays >= minimumActiveDays;
  const reason = eligible
    ? `Met usage thresholds with ${count} ${interactionsLabel(
        count
      )} across ${activeDays} active ${daysLabel(activeDays)} in ${timeframeDays} days`
    : `Needs at least ${minimumInteractions} ${interactionsLabel(
        minimumInteractions
      )} across ${minimumActiveDays} active ${daysLabel(
        minimumActiveDays
      )} in ${timeframeDays} days; observed ${count} ${interactionsLabel(
        count
      )} across ${activeDays} ${daysLabel(activeDays)}`;

  return {
    eligible,
    metadata: {
      walletAddress: normalizedWallet,
      timeframeDays,
      minimumInteractions,
      minimumActiveDays,
      observedInteractions: count,
      activeDays,
      reason,
      sourceQueryIdentifiers: [sourceId]
    }
  };
};
