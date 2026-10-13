import { describe, expect, it } from 'vitest';

import {
  USAGE_ENGINE_VERSION,
  USAGE_OUTPUT_PROTOCOL,
  USAGE_OUTPUT_VERSION,
  type UsageOutputV1,
  type UsageSummary,
  type UsageWindow
} from '../../src/core/contracts/usageOutputV1.js';
import { computeInsightV1, type InsightV1 } from '../../src/core/insights/insightsV1.js';
import { createTTLCache } from '../../src/services/cacheService.js';
import { createInsightsService } from '../../src/services/insightsService.js';

const createOutput = (
  usage_summary: UsageSummary,
  overrides: Partial<UsageOutputV1> = {}
): UsageOutputV1 => ({
  protocol: USAGE_OUTPUT_PROTOCOL,
  output_version: USAGE_OUTPUT_VERSION,
  wallet: '0x000000000000000000000000000000000000dead',
  campaign_id: 'airdrop_v1',
  window: { type: 'custom', start: 1_700_000_000, end: 1_700_086_400 },
  verified_usage: true,
  usage_summary,
  criteria: {
    criteria_set_id: 'airdrop/basic@1',
    engine_version: USAGE_ENGINE_VERSION,
    params: {
      min_days_active: 0,
      min_tx_count: 0,
      min_unique_contracts: 0
    }
  },
  proof: {
    hash_algorithm: 'keccak256',
    canonical_hash: '0x' + 'a'.repeat(64)
  },
  ...overrides
});

const fixedNow = () => 1_700_000_000_000;

describe('Insights v1', () => {
  it('returns deterministic insights for the same output', () => {
    const output = createOutput({
      days_active: 10,
      tx_count: 25,
      unique_contracts: 5
    });

    const first = computeInsightV1(output);
    const second = computeInsightV1(output);

    expect(first).toEqual(second);
  });

  it('tags inactive wallets at the lower thresholds', () => {
    const output = createOutput({
      days_active: 1,
      tx_count: 2,
      unique_contracts: 1
    });

    const insight = computeInsightV1(output);

    expect(insight.behavior_tag).toBe('inactive');
  });

  it('tags suspected farms when farm probability is high and unique contracts are low', () => {
    const output = createOutput({
      days_active: 1,
      tx_count: 120,
      unique_contracts: 1
    });

    const insight = computeInsightV1(output);

    expect(insight.behavior_tag).toBe('suspected_farm');
  });

  it('tags organic behavior for high activity with low farm probability', () => {
    const output = createOutput({
      days_active: 30,
      tx_count: 60,
      unique_contracts: 20
    });

    const insight = computeInsightV1(output);

    expect(insight.behavior_tag).toBe('organic');
  });

  it('returns cached insights on the second call', () => {
    const cache = createTTLCache<InsightV1>({
      ttlMs: 30 * 60 * 1000,
      now: fixedNow
    });
    const service = createInsightsService({ cache });
    const output = createOutput({
      days_active: 12,
      tx_count: 40,
      unique_contracts: 8
    });

    const first = service.computeInsight(output);
    const second = service.computeInsight(output);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
  });

  it('computes campaign insights summary fields', async () => {
    const window: UsageWindow = { type: 'custom', start: 1_700_000_000, end: 1_700_086_400 };
    const outputs = [
      createOutput(
        { days_active: 1, tx_count: 2, unique_contracts: 1 },
        {
          wallet: '0x0000000000000000000000000000000000000001',
          proof: { hash_algorithm: 'keccak256', canonical_hash: '0x' + '1'.repeat(64) }
        }
      ),
      createOutput(
        { days_active: 30, tx_count: 60, unique_contracts: 20 },
        {
          wallet: '0x0000000000000000000000000000000000000002',
          proof: { hash_algorithm: 'keccak256', canonical_hash: '0x' + '2'.repeat(64) }
        }
      ),
      createOutput(
        { days_active: 1, tx_count: 120, unique_contracts: 1 },
        {
          wallet: '0x0000000000000000000000000000000000000003',
          proof: { hash_algorithm: 'keccak256', canonical_hash: '0x' + '3'.repeat(64) }
        }
      )
    ];

    outputs[1].verified_usage = false;

    const baseSummary = (() => {
      const total = outputs.length;
      const verified_true = outputs.filter((item) => item.verified_usage).length;
      const verified_false = total - verified_true;
      const verified_rate = total ? verified_true / total : 0;
      const totals = outputs.reduce(
        (acc, item) => {
          acc.tx += item.usage_summary.tx_count;
          acc.days += item.usage_summary.days_active;
          acc.uniq += item.usage_summary.unique_contracts;
          return acc;
        },
        { tx: 0, days: 0, uniq: 0 }
      );

      return {
        total,
        verified_true,
        verified_false,
        verified_rate,
        avg_tx_count: total ? totals.tx / total : 0,
        avg_days_active: total ? totals.days / total : 0,
        avg_unique_contracts: total ? totals.uniq / total : 0
      };
    })();

    const evaluator = {
      runCampaignBatch: async () => ({
        results: outputs.map((output) => ({
          wallet: output.wallet,
          output,
          cached: false
        })),
        summary: baseSummary,
        meta: { as_of_block: 9_999_999 }
      })
    };

    const cache = createTTLCache<InsightV1>({
      ttlMs: 30 * 60 * 1000,
      now: fixedNow
    });

    const service = createInsightsService({ cache, evaluator });

    const result = await service.runCampaignInsights({
      campaign_id: 'airdrop_v1',
      window,
      wallets: outputs.map((output) => output.wallet),
      mode: 'sync'
    });

    const insights = outputs.map((output) => computeInsightV1(output));
    const suspected_farm_count = insights.filter(
      (entry) => entry.behavior_tag === 'suspected_farm'
    ).length;
    const avg_score =
      insights.reduce((sum, entry) => sum + entry.overall_score, 0) / insights.length;

    expect(result.summary).toEqual({
      ...baseSummary,
      suspected_farm_count,
      suspected_farm_rate: suspected_farm_count / outputs.length,
      avg_score
    });
  });
});

