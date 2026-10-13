import { getAddress } from 'ethers';
import { describe, expect, it } from 'vitest';

import { canonicalizeUsageOutputV1 } from '../../src/core/canonicalize/canonicalJson.js';
import { evaluateUsageV1 } from '../../src/core/evaluator/evaluateUsageV1.js';
import { getUsageOutputHash } from '../../src/core/proof/proofHash.js';

describe('Usage output v1', () => {
  it('produces deterministic canonical JSON and hash', () => {
    const input = {
      wallet: '0x8ba1f109551bd432803012645ac136ddd64dba72',
      campaign_id: 'airdrop-2025',
      window: { type: 'last_7_days' as const, end: 1_700_000_000 },
      criteria: { criteria_set_id: 'airdrop/basic@1' },
      activity: {
        type: 'transactions' as const,
        transactions: [
          {
            timestamp: 1_699_500_000,
            contractAddress: '0x1111111111111111111111111111111111111111'
          },
          {
            timestamp: 1_699_503_600,
            contractAddress: '0x2222222222222222222222222222222222222222'
          },
          {
            timestamp: 1_699_580_000,
            contractAddress: '0x1111111111111111111111111111111111111111'
          }
        ]
      }
    };

    const first = evaluateUsageV1(input);
    const second = evaluateUsageV1(input);
    expect(first).toEqual(second);

    const canonicalFirst = canonicalizeUsageOutputV1(first);
    const canonicalSecond = canonicalizeUsageOutputV1(second);
    expect(canonicalFirst).toBe(canonicalSecond);
    expect(canonicalFirst.startsWith('{"protocol":"indexflow","output_version":"1.0","wallet"'))
      .toBe(true);

    const { hash, canonical_json } = getUsageOutputHash(first);
    expect(hash).toBe(first.proof.canonical_hash);
    expect(canonical_json).toBe(getUsageOutputHash(second).canonical_json);
  });

  it('enforces AND logic at the threshold boundaries', () => {
    const baseInput = {
      wallet: '0x8ba1f109551bd432803012645ac136ddd64dba72',
      campaign_id: 'airdrop-2025',
      window: { type: 'custom' as const, start: 1_699_000_000, end: 1_699_086_400 },
      criteria: {
        criteria_set_id: 'custom/manual@1',
        params: {
          min_days_active: 2,
          min_tx_count: 3,
          min_unique_contracts: 1
        }
      }
    };

    const passes = evaluateUsageV1({
      ...baseInput,
      activity: {
        type: 'summary',
        summary: { days_active: 2, tx_count: 3, unique_contracts: 1 }
      }
    });
    expect(passes.verified_usage).toBe(true);

    const fails = evaluateUsageV1({
      ...baseInput,
      activity: {
        type: 'summary',
        summary: { days_active: 2, tx_count: 2, unique_contracts: 1 }
      }
    });
    expect(fails.verified_usage).toBe(false);
  });

  it('fills non-custom window start and validates custom windows', () => {
    const output = evaluateUsageV1({
      wallet: '0x8ba1f109551bd432803012645ac136ddd64dba72',
      campaign_id: 'airdrop-2025',
      window: { type: 'last_30_days', end: 1_700_000_000 },
      criteria: { criteria_set_id: 'airdrop/basic@1' },
      activity: { type: 'summary', summary: { days_active: 0, tx_count: 0, unique_contracts: 0 } }
    });

    expect(output.window.start).toBe(1_700_000_000 - 30 * 24 * 60 * 60);
    expect(output.window.end).toBe(1_700_000_000);

    expect(() =>
      evaluateUsageV1({
        wallet: '0x8ba1f109551bd432803012645ac136ddd64dba72',
        campaign_id: 'airdrop-2025',
        window: { type: 'custom', end: 1_700_000_000 },
        criteria: { criteria_set_id: 'airdrop/basic@1' },
        activity: { type: 'summary', summary: { days_active: 0, tx_count: 0, unique_contracts: 0 } }
      })
    ).toThrow();
  });

  it('normalizes wallet addresses to checksum', () => {
    const wallet = '0x8ba1f109551bd432803012645ac136ddd64dba72';
    const output = evaluateUsageV1({
      wallet,
      campaign_id: 'airdrop-2025',
      window: { type: 'custom', start: 1_699_000_000, end: 1_699_086_400 },
      criteria: { criteria_set_id: 'airdrop/basic@1' },
      activity: { type: 'summary', summary: { days_active: 0, tx_count: 0, unique_contracts: 0 } }
    });

    expect(output.wallet).toBe(getAddress(wallet));
  });
});

