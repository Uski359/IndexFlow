import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { GetWalletMetricsInput } from '../../src/services/metrics/IMetricsProvider.js';

const { getTransfersCollectionMock } = vi.hoisted(() => ({
  getTransfersCollectionMock: vi.fn()
}));

vi.mock('../../src/infra/indexer/db/mongo.js', () => ({
  getTransfersCollection: getTransfersCollectionMock
}));

type TransferDoc = {
  chainId?: string;
  chain?: string;
  contractAddress?: string;
  timestamp: number;
  from: string;
  to: string;
  txHash: string;
  logIndex: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const matchesQuery = (doc: TransferDoc, query: Record<string, unknown>): boolean => {
  for (const [key, value] of Object.entries(query)) {
    if (key === '$and') {
      const andFilters = value as Record<string, unknown>[];
      if (!andFilters.every((filter) => matchesQuery(doc, filter))) {
        return false;
      }
      continue;
    }

    if (key === '$or') {
      const orFilters = value as Record<string, unknown>[];
      if (!orFilters.some((filter) => matchesQuery(doc, filter))) {
        return false;
      }
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      const op = value as Record<string, unknown>;
      const docValue = (doc as Record<string, unknown>)[key];

      if ('$in' in op) {
        const values = op.$in as unknown[];
        if (!values.includes(docValue)) {
          return false;
        }
        continue;
      }

      if ('$gte' in op || '$lte' in op) {
        const lower = (op.$gte as number | undefined) ?? Number.NEGATIVE_INFINITY;
        const upper = (op.$lte as number | undefined) ?? Number.POSITIVE_INFINITY;
        const numericValue = Number(docValue);
        if (numericValue < lower || numericValue > upper) {
          return false;
        }
        continue;
      }
    }

    if ((doc as Record<string, unknown>)[key] !== value) {
      return false;
    }
  }

  return true;
};

const createCollection = (docs: TransferDoc[]) => ({
  findOne: vi.fn(async (query: Record<string, unknown>) => {
    const match = docs.find((doc) => matchesQuery(doc, query));
    return match ?? null;
  }),
  aggregate: vi.fn((pipeline: Array<Record<string, unknown>>) => ({
    toArray: async () => {
      const matchStage = pipeline[0]?.$match as Record<string, unknown>;
      const filtered = docs.filter((doc) => matchesQuery(doc, matchStage));
      if (!filtered.length) {
        return [];
      }

      const days = new Set(
        filtered.map((doc) =>
          Math.floor((doc.timestamp >= 10_000_000_000 ? doc.timestamp : doc.timestamp * 1000) / DAY_MS)
        )
      );

      return [
        {
          tx_count: filtered.length,
          days_active: days.size
        }
      ];
    }
  }))
});

const baseInput: GetWalletMetricsInput = {
  chain_id: 11155111,
  campaign_id: 'airdrop_v1',
  wallet: '0x1111111111111111111111111111111111111111',
  start: 1_700_000_000,
  end: 1_700_172_800,
  targets: ['0x0000000000000000000000000000000000000001']
};

describe('IndexerDbMetricsProvider', () => {
  beforeEach(() => {
    getTransfersCollectionMock.mockReset();
  });

  it('computes tx_count and days_active from scoped transfer records', async () => {
    const { IndexerDbMetricsProvider } = await import(
      '../../src/services/metrics/providers/IndexerDbMetricsProvider.js'
    );

    const docs: TransferDoc[] = [
      {
        chainId: 'sepolia',
        contractAddress: '0x0000000000000000000000000000000000000001',
        timestamp: 1_700_000_100_000,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x9999999999999999999999999999999999999999',
        txHash: '0xaaa',
        logIndex: 0
      },
      {
        chainId: 'sepolia',
        contractAddress: '0x0000000000000000000000000000000000000001',
        timestamp: 1_700_000_200_000,
        from: '0x9999999999999999999999999999999999999999',
        to: '0x1111111111111111111111111111111111111111',
        txHash: '0xaab',
        logIndex: 0
      },
      {
        chainId: 'sepolia',
        contractAddress: '0x0000000000000000000000000000000000000001',
        timestamp: 1_700_090_000_000,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x8888888888888888888888888888888888888888',
        txHash: '0xaac',
        logIndex: 0
      },
      {
        chainId: 'sepolia',
        contractAddress: '0x0000000000000000000000000000000000000002',
        timestamp: 1_700_010_000_000,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x7777777777777777777777777777777777777777',
        txHash: '0xaad',
        logIndex: 0
      }
    ];

    getTransfersCollectionMock.mockResolvedValue(createCollection(docs));

    const provider = new IndexerDbMetricsProvider();
    const result = await provider.getWalletMetrics(baseInput);

    expect(result).toEqual({
      tx_count: 3,
      days_active: 2,
      unique_contracts: 0
    });
  });

  it('throws when DB has no indexed records for requested targets/window', async () => {
    const { IndexerDbMetricsProvider } = await import(
      '../../src/services/metrics/providers/IndexerDbMetricsProvider.js'
    );

    const docs: TransferDoc[] = [
      {
        chainId: 'sepolia',
        contractAddress: '0x0000000000000000000000000000000000000009',
        timestamp: 1_700_010_000_000,
        from: '0x1111111111111111111111111111111111111111',
        to: '0x7777777777777777777777777777777777777777',
        txHash: '0xbbb',
        logIndex: 0
      }
    ];

    getTransfersCollectionMock.mockResolvedValue(createCollection(docs));

    const provider = new IndexerDbMetricsProvider();

    await expect(provider.getWalletMetrics(baseInput)).rejects.toMatchObject({
      name: 'MetricsNotAvailableError',
      message: 'db_not_indexed_for_targets'
    });
  });
});
