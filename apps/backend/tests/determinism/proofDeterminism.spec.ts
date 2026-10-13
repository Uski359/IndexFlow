import { getAddress } from 'ethers';
import { describe, expect, it } from 'vitest';

import { evaluateUsageV1 } from '../../src/core/evaluator/evaluateUsageV1.js';

describe('Proof determinism (ENS vs address)', () => {
  it('produces the same proof hash for normalized and checksummed addresses', () => {
    const raw = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const checksummed = getAddress(raw);

    const baseInput = {
      campaign_id: 'airdrop_v1',
      window: { type: 'last_7_days' as const, end: 1_700_000_000 },
      activity: {
        type: 'summary' as const,
        summary: { days_active: 3, tx_count: 12, unique_contracts: 4 }
      }
    };

    const fromEns = evaluateUsageV1({ ...baseInput, wallet: raw });
    const fromAddress = evaluateUsageV1({ ...baseInput, wallet: checksummed });

    expect(fromEns.proof.canonical_hash).toBe(fromAddress.proof.canonical_hash);
  });
});

