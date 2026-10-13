import { logger } from '../../../infra/config/logger.js';
import { getTransfersCollection } from '../../../infra/indexer/db/mongo.js';
import type {
  GetWalletMetricsInput,
  IMetricsProvider,
  WalletMetricsV1
} from '../IMetricsProvider.js';
import { MetricsNotAvailableError } from '../errors.js';
import {
  resolveChainAliases,
  resolveTargets,
  resolveWalletVariants,
  toUnixMilliseconds,
  toUnixSeconds
} from '../providerInput.js';

const DAY_MS = 24 * 60 * 60 * 1000;

type MetricsAggregate = {
  tx_count: number;
  days_active: number;
};

export class IndexerDbMetricsProvider implements IMetricsProvider {
  async getWalletMetrics(input: GetWalletMetricsInput): Promise<WalletMetricsV1> {
    const chainAliases = resolveChainAliases(input.chain_id);
    const targets = resolveTargets(input);
    const walletVariants = resolveWalletVariants(input.wallet);
    const startMs = toUnixMilliseconds(input.start);
    const endMs = toUnixMilliseconds(input.end);
    const startSec = toUnixSeconds(input.start);
    const endSec = toUnixSeconds(input.end);

    if (targets.length === 0) {
      throw new MetricsNotAvailableError('no_targets');
    }

    if (walletVariants.length === 0) {
      throw new MetricsNotAvailableError('invalid_wallet');
    }

    let collection: Awaited<ReturnType<typeof getTransfersCollection>>;
    try {
      collection = await getTransfersCollection();
    } catch (error) {
      throw new MetricsNotAvailableError('db_connection_failed', error);
    }

    const chainMatch = {
      $or: [
        { chainId: { $in: chainAliases } },
        { chain: { $in: chainAliases } }
      ]
    };

    const contractMatch = {
      $or: [
        { contractAddress: { $in: targets } },
        { contract_address: { $in: targets } },
        { address: { $in: targets } }
      ]
    };

    const timestampMatch = {
      $or: [
        { timestamp: { $gte: startMs, $lte: endMs } },
        { timestamp: { $gte: startSec, $lte: endSec } }
      ]
    };

    const queryScope = {
      $and: [chainMatch, contractMatch, timestampMatch]
    };

    try {
      const hasChainData = await collection.findOne(chainMatch, { projection: { _id: 1 } });
      if (!hasChainData) {
        throw new MetricsNotAvailableError('db_not_indexed');
      }

      const hasScopedData = await collection.findOne(queryScope, { projection: { _id: 1 } });
      if (!hasScopedData) {
        throw new MetricsNotAvailableError('db_not_indexed_for_targets');
      }

      const walletMatch = {
        $or: [
          { from: { $in: walletVariants } },
          { to: { $in: walletVariants } }
        ]
      };

      const [result] = await collection
        .aggregate<MetricsAggregate>([
          { $match: { $and: [queryScope, walletMatch] } },
          {
            $addFields: {
              normalizedTimestamp: {
                $cond: [
                  { $gte: ['$timestamp', 10_000_000_000] },
                  '$timestamp',
                  { $multiply: ['$timestamp', 1000] }
                ]
              }
            }
          },
          {
            $group: {
              _id: null,
              tx_count: { $sum: 1 },
              days: {
                $addToSet: {
                  $floor: { $divide: ['$normalizedTimestamp', DAY_MS] }
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              tx_count: 1,
              days_active: { $size: '$days' }
            }
          }
        ])
        .toArray();

      const metrics = {
        tx_count: Math.max(0, Math.trunc(result?.tx_count ?? 0)),
        days_active: Math.max(0, Math.trunc(result?.days_active ?? 0)),
        unique_contracts: 0
      };

      logger.debug(
        {
          source: 'db',
          chain_id: input.chain_id,
          wallet: walletVariants[0],
          targets_count: targets.length,
          start: input.start,
          end: input.end
        },
        'Resolved wallet metrics'
      );

      return metrics;
    } catch (error) {
      if (error instanceof MetricsNotAvailableError) {
        throw error;
      }
      throw new MetricsNotAvailableError('db_metrics_query_failed', error);
    }
  }
}
