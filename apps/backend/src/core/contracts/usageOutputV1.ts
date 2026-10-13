export const USAGE_OUTPUT_PROTOCOL = 'indexflow' as const;
export const USAGE_OUTPUT_VERSION = '1.0' as const;
export const USAGE_ENGINE_VERSION = 'v1' as const;

export type UsageWindowType = 'last_7_days' | 'last_14_days' | 'last_30_days' | 'custom';

export type UsageWindow = {
  type: UsageWindowType;
  start: number;
  end: number;
};

export type UsageSummary = {
  days_active: number;
  tx_count: number;
  unique_contracts: number;
};

export type UsageCriteriaParams = {
  min_days_active: number;
  min_tx_count: number;
  min_unique_contracts: number;
};

export type UsageCriteria = {
  criteria_set_id: string;
  engine_version: typeof USAGE_ENGINE_VERSION;
  params: UsageCriteriaParams;
};

export type UsageProof = {
  hash_algorithm: 'keccak256';
  canonical_hash: string;
};

export type UsageOutputV1 = {
  protocol: typeof USAGE_OUTPUT_PROTOCOL;
  output_version: typeof USAGE_OUTPUT_VERSION;
  wallet: string;
  campaign_id: string;
  window: UsageWindow;
  verified_usage: boolean;
  usage_summary: UsageSummary;
  criteria: UsageCriteria;
  proof: UsageProof;
};
