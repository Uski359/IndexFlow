import { describe, expect, it } from 'vitest';

import {
  USAGE_ENGINE_VERSION,
  USAGE_OUTPUT_PROTOCOL,
  USAGE_OUTPUT_VERSION,
  type UsageOutputV1,
  type UsageSummary
} from '../../src/core/contracts/usageOutputV1.js';
import { computeInsightV1 } from '../../src/core/insights/insightsV1.js';
import { createCommentaryService } from '../../src/services/commentary/commentaryService.js';
import { DisabledProvider } from '../../src/services/commentary/providers/disabledProvider.js';
import type { CommentaryV1 } from '../../src/services/commentary/types.js';
import { createTTLCache } from '../../src/services/cacheService.js';

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

describe('Commentary v1', () => {
  it('builds deterministic commentary for the disabled provider', async () => {
    const output = createOutput({
      days_active: 30,
      tx_count: 60,
      unique_contracts: 20
    });
    const insights = computeInsightV1(output);
    const provider = new DisabledProvider();

    const text = await provider.generate({ output, insights });

    expect(text).toBe(
      'Consistent activity across 30 active days with 20 contracts; low farming risk. Score: 73/100, Farming risk: 28%.'
    );
  });

  it('returns cached commentary on the second call', async () => {
    const output = createOutput({
      days_active: 12,
      tx_count: 40,
      unique_contracts: 8
    });
    const insights = computeInsightV1(output);
    const cache = createTTLCache<CommentaryV1>({
      ttlMs: 30 * 60 * 1000,
      now: fixedNow
    });
    const service = createCommentaryService({ cache, provider: new DisabledProvider() });

    const first = await service.getCommentaryForOutput(output, insights);
    const second = await service.getCommentaryForOutput(output, insights);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
  });

  it('returns commentary payload fields', async () => {
    const output = createOutput({
      days_active: 5,
      tx_count: 10,
      unique_contracts: 3
    });
    const insights = computeInsightV1(output);
    const service = createCommentaryService({ provider: new DisabledProvider() });

    const result = await service.getCommentaryForOutput(output, insights);

    expect(result.commentary).toMatchObject({
      commentary_version: 'v1',
      model: 'disabled',
      text: expect.any(String)
    });
    expect(result.commentary.created_at).toBeGreaterThan(0);
  });
});

