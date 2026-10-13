import type { UsageCriteriaParams } from '../contracts/usageOutputV1.js';

export type UsageCriteriaPreset = {
  criteria_set_id: string;
  params: UsageCriteriaParams;
};

export const DEFAULT_CRITERIA_SET_ID = 'airdrop/basic@1';

export const criteriaPresets: Record<string, UsageCriteriaPreset> = {
  [DEFAULT_CRITERIA_SET_ID]: {
    criteria_set_id: DEFAULT_CRITERIA_SET_ID,
    params: {
      min_days_active: 7,
      min_tx_count: 10,
      min_unique_contracts: 3
    }
  }
};
