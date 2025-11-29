import type { Log } from 'ethers';

import '../env.js';
import type { ChainConfig } from '../chains/types.js';
import {
  getContributionsCollection,
  getPoiEventsCollection,
  getStakingEventsCollection
} from '../db/mongo.js';
import { saveTransfer } from '../db/transfers.js';
import { logger } from '../logger.js';
import { getChainConfig } from '../chains/index.js';
import { parseTransfer, TRANSFER_TOPIC } from '../parsers/erc20.js';
import {
  parseStakingEvent,
  REWARD_TOPIC,
  STAKED_TOPIC,
  UNSTAKED_TOPIC
} from '../parsers/staking.js';
import { parseProofSubmitted, PROOF_SUBMITTED_TOPIC } from '../parsers/poi.js';
import {
  CONTRIBUTION_RECORDED_TOPIC,
  parseContributionRecorded
} from '../parsers/contributions.js';
import { getProvider, type RateLimitedProvider } from '../services/provider.js';
import { withRetry } from '../utils/retry.js';

const BATCH_SIZE = Math.max(1, Number(process.env.INDEXER_BATCH_SIZE ?? '200'));

type ContractTarget = { address: string; deployBlock: number };

const requireChainReady = (
  chainId: string
): ChainConfig & { tokenAddress: string; deployBlock: number } => {
  const chain = getChainConfig(chainId);
  const { tokenAddress, deployBlock } = chain;

  if (!tokenAddress) {
    throw new Error(`Token address missing for chain ${chainId}. Update chains config.`);
  }

  if (deployBlock === null) {
    throw new Error(`deployBlock missing for chain ${chainId}. Update chains config.`);
  }

  return { ...chain, tokenAddress, deployBlock };
};

const resolveTarget = (
  label: string,
  target: { address: string; deployBlock?: number | null } | undefined,
  fallbackDeployBlock: number
): ContractTarget | null => {
  if (!target?.address) {
    return null;
  }

  const deployBlock = target.deployBlock ?? fallbackDeployBlock;
  if (deployBlock === null || deployBlock === undefined) {
    throw new Error(`deployBlock missing for ${label}`);
  }

  return {
    address: target.address,
    deployBlock
  };
};

const getLogIndex = (log: Log): number =>
  (log as { logIndex?: number }).logIndex ?? (log as { index?: number }).index ?? 0;

const fetchLogs = async (
  chainId: string,
  provider: RateLimitedProvider,
  address: string,
  topics: (string | string[] | null)[],
  fromBlock: number,
  toBlock: number
): Promise<Log[]> =>
  withRetry(
    () =>
      provider.getLogs({
        address,
        topics,
        fromBlock,
        toBlock
      }),
    { taskName: `${chainId}:getLogs:${fromBlock}-${toBlock}`, logger }
  ).catch((error: unknown) => {
    logger.error('Failed to fetch logs; skipping range', { chainId, err: error, fromBlock, toBlock });
    return [] as Log[];
  });

const createTimestampResolver = (provider: RateLimitedProvider) => {
  const cache = new Map<number, number>();
  return async (blockNumber: number): Promise<number> => {
    if (cache.has(blockNumber)) {
      return cache.get(blockNumber)!;
    }

    const block = await withRetry(
      () => provider.provider.getBlock(blockNumber),
      { taskName: `${provider.chain.id}:getBlock:${blockNumber}`, logger }
    ).catch((error: unknown) => {
      logger.error('Failed to fetch block timestamp', { chainId: provider.chain.id, err: error, blockNumber });
      return null;
    });

    const timestampMs = Number(block?.timestamp ?? 0) * 1000;
    cache.set(blockNumber, timestampMs);
    return timestampMs;
  };
};

interface BackfillParams {
  chainId: string;
  provider: RateLimitedProvider;
  target: ContractTarget;
  topics: (string | string[] | null)[];
  latest: number;
  label: string;
  onLog: (log: Log) => Promise<void>;
}

const backfillContract = async ({
  chainId,
  provider,
  target,
  topics,
  latest,
  label,
  onLog
}: BackfillParams): Promise<number> => {
  let total = 0;

  for (let start = target.deployBlock; start <= latest; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, latest);
    // eslint-disable-next-line no-await-in-loop
    const logs = await fetchLogs(chainId, provider, target.address, topics, start, end);

    if (!logs.length) {
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    for (const log of logs) {
      // eslint-disable-next-line no-await-in-loop
      await onLog(log);
    }

    total += logs.length;

    logger.info(`Synced ${label} logs for block range`, {
      chainId,
      fromBlock: start,
      toBlock: end,
      count: logs.length
    });
  }

  return total;
};

export const runBackfill = async (chainId: string): Promise<void> => {
  const chain = requireChainReady(chainId);
  const provider = getProvider(chainId);
  const latest = await provider.getBlockNumber();

  const stakingTarget = resolveTarget('stakingPool', chain.utility?.stakingPool, chain.deployBlock);
  const poiTarget = resolveTarget('proofOfIndexing', chain.utility?.proofOfIndexing, chain.deployBlock);
  const contributionTarget = resolveTarget(
    'contributionRegistry',
    chain.utility?.contributionRegistry,
    chain.deployBlock
  );

  logger.info('Starting backfill', {
    chainId: chain.id,
    latest,
    deployBlock: chain.deployBlock,
    stakingFrom: stakingTarget?.deployBlock,
    poiFrom: poiTarget?.deployBlock,
    contributionsFrom: contributionTarget?.deployBlock
  });

  const timestampForBlock = createTimestampResolver(provider);

  const stakingCollection = await getStakingEventsCollection();
  const poiCollection = await getPoiEventsCollection();
  const contributionsCollection = await getContributionsCollection();

  let totalLogs = 0;

  totalLogs += await backfillContract({
    chainId: chain.id,
    provider,
    target: { address: chain.tokenAddress, deployBlock: chain.deployBlock },
    topics: [TRANSFER_TOPIC],
    latest,
    label: 'transfer',
    onLog: async (log) => {
      const parsed = parseTransfer(log);
      const logIndex = getLogIndex(log);

      await saveTransfer({
        chain: chain.id,
        blockNumber: Number(log.blockNumber),
        txHash: log.transactionHash,
        logIndex,
        from: parsed.from,
        to: parsed.to,
        value: parsed.value,
        timestamp: await timestampForBlock(Number(log.blockNumber))
      }).catch((error: unknown) => {
        logger.error('Failed to persist transfer event', {
          chainId: chain.id,
          err: error,
          txHash: log.transactionHash,
          logIndex
        });
      });
    }
  });

  if (stakingTarget) {
    totalLogs += await backfillContract({
      chainId: chain.id,
      provider,
      target: stakingTarget,
      topics: [[STAKED_TOPIC, UNSTAKED_TOPIC, REWARD_TOPIC]],
      latest,
      label: 'staking',
      onLog: async (log) => {
        const parsed = parseStakingEvent(log);
        const logIndex = getLogIndex(log);
        const timestamp = await timestampForBlock(Number(log.blockNumber));

        await withRetry(
          () =>
            stakingCollection.updateOne(
              { chain: chain.id, txHash: log.transactionHash, logIndex },
              {
                $set: {
                  chain: chain.id,
                  block: Number(log.blockNumber),
                  txHash: log.transactionHash,
                  logIndex,
                  user: parsed.user,
                  amount: parsed.amount,
                  eventType: parsed.eventType,
                  timestamp
                }
              },
              { upsert: true }
            ),
          { taskName: `mongo:staking:${chain.id}:${log.transactionHash}:${logIndex}`, logger, baseDelayMs: 300 }
        ).catch((error: unknown) => {
          logger.error('Failed to persist staking event', {
            chainId: chain.id,
            err: error,
            txHash: log.transactionHash,
            logIndex
          });
        });
      }
    });
  }

  if (poiTarget) {
    totalLogs += await backfillContract({
      chainId: chain.id,
      provider,
      target: poiTarget,
      topics: [PROOF_SUBMITTED_TOPIC],
      latest,
      label: 'poi',
      onLog: async (log) => {
        const parsed = parseProofSubmitted(log);
        const logIndex = getLogIndex(log);

        await withRetry(
          () =>
            poiCollection.updateOne(
              { chain: chain.id, txHash: log.transactionHash, logIndex },
              {
                $set: {
                  chain: chain.id,
                  block: Number(log.blockNumber),
                  txHash: log.transactionHash,
                  logIndex,
                  operator: parsed.operator,
                  chainId: parsed.chainId,
                  fromBlock: parsed.fromBlock,
                  toBlock: parsed.toBlock,
                  proofHash: parsed.proofHash,
                  timestamp: parsed.timestamp
                }
              },
              { upsert: true }
            ),
          { taskName: `mongo:poi:${chain.id}:${log.transactionHash}:${logIndex}`, logger, baseDelayMs: 300 }
        ).catch((error: unknown) => {
          logger.error('Failed to persist PoI event', {
            chainId: chain.id,
            err: error,
            txHash: log.transactionHash,
            logIndex
          });
        });
      }
    });
  }

  if (contributionTarget) {
    totalLogs += await backfillContract({
      chainId: chain.id,
      provider,
      target: contributionTarget,
      topics: [CONTRIBUTION_RECORDED_TOPIC],
      latest,
      label: 'contribution',
      onLog: async (log) => {
        const parsed = parseContributionRecorded(log);
        const logIndex = getLogIndex(log);

        await withRetry(
          () =>
            contributionsCollection.updateOne(
              { chain: chain.id, txHash: log.transactionHash, logIndex },
              {
                $set: {
                  chain: chain.id,
                  block: Number(log.blockNumber),
                  txHash: log.transactionHash,
                  logIndex,
                  user: parsed.user,
                  contributionType: parsed.contributionType,
                  weight: parsed.weight,
                  timestamp: parsed.timestamp
                }
              },
              { upsert: true }
            ),
          {
            taskName: `mongo:contributions:${chain.id}:${log.transactionHash}:${logIndex}`,
            logger,
            baseDelayMs: 300
          }
        ).catch((error: unknown) => {
          logger.error('Failed to persist contribution event', {
            chainId: chain.id,
            err: error,
            txHash: log.transactionHash,
            logIndex
          });
        });
      }
    });
  }

  logger.info('Backfill completed', {
    chainId: chain.id,
    fromBlock: chain.deployBlock,
    toBlock: latest,
    totalLogs
  });
};
