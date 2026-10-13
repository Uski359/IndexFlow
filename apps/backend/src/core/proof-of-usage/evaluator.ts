import { defaultProofOfUsageCriteria, type ProofOfUsageCriteria } from './criteria.js';

type ProofOfUsageMetrics = {
  txCount: number;
  activeDays: number;
  timeframeDays: number;
};

export type ProofOfUsageResult = {
  eligible: boolean;
  metrics: ProofOfUsageMetrics;
  reason: string;
};

const normalizeWallet = (wallet: string) => {
  const trimmed = wallet.trim().toLowerCase();
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
};

const resolveNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const fetchRecentInteractions = async (wallet: string, timeframeDays: number) => {
  // Deterministic, read-only placeholder based on the wallet address.
  const seed = wallet.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  const txCount = (seed % 20) + 1;
  const activeDays = Math.min((seed % 10) + 1, txCount, timeframeDays);

  return { txCount, activeDays };
};

export const evaluateProofOfUsage = async (
  wallet: string,
  criteria?: Partial<ProofOfUsageCriteria>
): Promise<ProofOfUsageResult> => {
  const normalizedWallet = normalizeWallet(wallet);

  const timeframeDays = criteria
    ? resolveNumber(criteria.timeframeDays, defaultProofOfUsageCriteria.timeframeDays)
    : defaultProofOfUsageCriteria.timeframeDays;
  const minimumInteractions = criteria
    ? resolveNumber(criteria.minimumInteractions, defaultProofOfUsageCriteria.minimumInteractions)
    : defaultProofOfUsageCriteria.minimumInteractions;
  const minimumActiveDays = criteria
    ? resolveNumber(criteria.minimumActiveDays, 1)
    : defaultProofOfUsageCriteria.minimumActiveDays ?? 1;

  const { txCount, activeDays } = await fetchRecentInteractions(normalizedWallet, timeframeDays);
  const eligible = txCount >= minimumInteractions && activeDays >= minimumActiveDays;
  const reason = eligible
    ? `Eligible with ${txCount} interactions across ${activeDays} active days in ${timeframeDays} days.`
    : `Not eligible: ${txCount} interactions across ${activeDays} active days in ${timeframeDays} days; requires ${minimumInteractions} interactions and ${minimumActiveDays} active days.`;

  return {
    eligible,
    metrics: {
      txCount,
      activeDays,
      timeframeDays
    },
    reason
  };
};
