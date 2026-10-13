import { describe, expect, it } from 'vitest';

import type { UsageOutputV1 } from '../../src/core/contracts/usageOutputV1.js';
import { createTTLCache } from '../../src/services/cacheService.js';
import { createEvaluatorService } from '../../src/services/evaluatorService.js';

const fixedNow = () => 1_700_000_000_000;

const createService = () =>
  createEvaluatorService({
    cache: createTTLCache<UsageOutputV1>({
      ttlMs: 30 * 60 * 1000,
      now: fixedNow
    })
  });

describe('Mock evaluation pipeline', () => {
  it('returns deterministic output and hash for the same input and explicit as_of_block', async () => {
    const request = {
      wallet: '0x000000000000000000000000000000000000dead',
      campaign_id: 'airdrop_v1',
      window: { type: 'last_30_days' as const, end: 1_700_000_000 },
      as_of_block: 11_111_111
    };

    const firstService = createService();
    const secondService = createService();

    const first = await firstService.evaluateWallet(request);
    const second = await secondService.evaluateWallet(request);

    expect(first.output.usage_summary).toEqual(second.output.usage_summary);
    expect(first.output).toEqual(second.output);
    expect(first.output.proof.canonical_hash).toBe(second.output.proof.canonical_hash);
    expect(first.meta.as_of_block).toBe(11_111_111);
    expect(second.meta.as_of_block).toBe(11_111_111);
  });

  it('produces deterministic batch runs', async () => {
    const service = createService();
    const wallets = service.generateMockWallets('airdrop_v1', 5);
    const request = {
      campaign_id: 'airdrop_v1',
      window: { type: 'last_7_days' as const, end: 1_700_000_000 },
      wallets,
      mode: 'sync' as const,
      as_of_block: 12_345_678
    };

    const first = await service.runCampaignBatch(request);
    const second = await createService().runCampaignBatch(request);

    expect(first.results).toEqual(second.results);
    expect(first.summary).toEqual(second.summary);
    expect(first.meta.as_of_block).toBe(12_345_678);
    expect(second.meta.as_of_block).toBe(12_345_678);
  });

  it('returns cached results on the second call', async () => {
    const cache = createTTLCache<UsageOutputV1>({
      ttlMs: 30 * 60 * 1000,
      now: fixedNow
    });
    const service = createEvaluatorService({ cache });
    const request = {
      wallet: '0x000000000000000000000000000000000000dead',
      campaign_id: 'airdrop_v1',
      window: { type: 'last_14_days' as const, end: 1_700_000_000 },
      as_of_block: 22_222_222
    };

    const first = await service.evaluateWallet(request);
    const second = await service.evaluateWallet(request);

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.output).toEqual(first.output);
  });
});

