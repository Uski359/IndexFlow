import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTTLCache } from '../../src/services/cacheService.js';
import type {
  GetWalletMetricsInput,
  IMetricsProvider,
  WalletMetricsV1
} from '../../src/services/metrics/IMetricsProvider.js';
import { MetricsNotAvailableError } from '../../src/services/metrics/errors.js';
import { CacheMetricsProvider } from '../../src/services/metrics/providers/CacheMetricsProvider.js';
import { FallbackMetricsProvider } from '../../src/services/metrics/providers/FallbackMetricsProvider.js';
import { IndexerDbMetricsProvider } from '../../src/services/metrics/providers/IndexerDbMetricsProvider.js';

const { getTransfersCollectionMock } = vi.hoisted(() => ({
  getTransfersCollectionMock: vi.fn()
}));

vi.mock('../../src/infra/indexer/db/mongo.js', () => ({
  getTransfersCollection: getTransfersCollectionMock
}));

const input: GetWalletMetricsInput = {
  chain_id: 1,
  wallet: '0x000000000000000000000000000000000000dead',
  start: 1_700_000_000,
  end: 1_700_086_400,
  campaign_id: 'airdrop_v1'
};

const createProvider = (fn: (input: GetWalletMetricsInput) => Promise<WalletMetricsV1>): IMetricsProvider => ({
  getWalletMetrics: fn
});

describe('Metrics provider chain', () => {
  beforeEach(() => {
    getTransfersCollectionMock.mockReset();
  });

  it('falls back to rpc when db reports metrics not available', async () => {
    const dbProvider = createProvider(async () => {
      throw new MetricsNotAvailableError('db_not_indexed');
    });
    const rpcMetrics: WalletMetricsV1 = {
      tx_count: 12,
      days_active: 3,
      unique_contracts: 0
    };
    const rpcProvider = createProvider(async () => rpcMetrics);

    const dbSpy = vi.spyOn(dbProvider, 'getWalletMetrics');
    const rpcSpy = vi.spyOn(rpcProvider, 'getWalletMetrics');

    const provider = new FallbackMetricsProvider([dbProvider, rpcProvider]);
    const result = await provider.getWalletMetrics(input);

    expect(result).toEqual(rpcMetrics);
    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
  });

  it('returns db metrics without calling rpc', async () => {
    const dbMetrics: WalletMetricsV1 = {
      tx_count: 4,
      days_active: 2,
      unique_contracts: 0
    };
    const dbProvider = createProvider(async () => dbMetrics);
    const rpcProvider = createProvider(async () => {
      throw new Error('rpc should not be called');
    });

    const dbSpy = vi.spyOn(dbProvider, 'getWalletMetrics');
    const rpcSpy = vi.spyOn(rpcProvider, 'getWalletMetrics');

    const provider = new FallbackMetricsProvider([dbProvider, rpcProvider]);
    const result = await provider.getWalletMetrics(input);

    expect(result).toEqual(dbMetrics);
    expect(dbSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('uses cache hits without calling downstream', async () => {
    const metrics: WalletMetricsV1 = {
      tx_count: 1,
      days_active: 1,
      unique_contracts: 0
    };
    const inner = createProvider(async () => metrics);
    const innerSpy = vi.spyOn(inner, 'getWalletMetrics');
    const cache = createTTLCache<WalletMetricsV1>({
      ttlMs: 60_000,
      now: () => 1_700_000_000_000
    });

    const provider = new CacheMetricsProvider(cache, inner);

    const first = await provider.getWalletMetrics(input);
    const second = await provider.getWalletMetrics(input);

    expect(first).toEqual(metrics);
    expect(second).toEqual(metrics);
    expect(innerSpy).toHaveBeenCalledTimes(1);
  });

  it('calls rpc fallback when indexer DB is unavailable', async () => {
    getTransfersCollectionMock.mockRejectedValue(new Error('mongo down'));

    const rpcMetrics: WalletMetricsV1 = {
      tx_count: 7,
      days_active: 2,
      unique_contracts: 0
    };
    const rpcProvider = createProvider(async () => rpcMetrics);
    const rpcSpy = vi.spyOn(rpcProvider, 'getWalletMetrics');

    const provider = new FallbackMetricsProvider([
      new IndexerDbMetricsProvider(),
      rpcProvider
    ]);
    const result = await provider.getWalletMetrics({
      ...input,
      targets: ['0x0000000000000000000000000000000000000001']
    });

    expect(result).toEqual(rpcMetrics);
    expect(rpcSpy).toHaveBeenCalledTimes(1);
  });
});
