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
import { getProvider, obfuscateRpcUrl, type RateLimitedProvider } from '../services/provider.js';
import { withRetry } from '../utils/retry.js';
import { loadLastProcessedBlock, persistLastProcessedBlock } from '../db/state.js';

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
  blockNumber: number
): Promise<Log[]> =>
  withRetry(
    () =>
      provider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
        address,
        topics
      }),
    { taskName: `${chainId}:getLogs:${blockNumber}`, logger }
  ).catch((error: unknown) => {
    logger.error('Failed to fetch block logs; skipping block', { chainId, err: error, blockNumber });
    return [] as Log[];
  });

const POLL_INTERVAL_MS = Math.max(1_000, Number(process.env.INDEXER_POLL_INTERVAL_MS ?? '5000'));
const LISTENER_BATCH_SIZE = Math.max(1, Number(process.env.INDEXER_BATCH_SIZE ?? '25'));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const runListener = async (chainId: string): Promise<void> => {
  const chain = requireChainReady(chainId);
  const provider = getProvider(chainId);

  const stakingTarget = resolveTarget('stakingPool', chain.utility?.stakingPool, chain.deployBlock);
  const poiTarget = resolveTarget('proofOfIndexing', chain.utility?.proofOfIndexing, chain.deployBlock);
  const contributionTarget = resolveTarget(
    'contributionRegistry',
    chain.utility?.contributionRegistry,
    chain.deployBlock
  );

  const stakingCollection = await getStakingEventsCollection();
  const poiCollection = await getPoiEventsCollection();
  const contributionsCollection = await getContributionsCollection();

  const resolveStartingBlock = async (): Promise<number> => {
    const persisted = await loadLastProcessedBlock(chain.id);
    if (persisted !== null) {
      return persisted;
    }

    const configuredStartRaw = process.env.START_BLOCK;
    if (configuredStartRaw !== undefined) {
      const configuredStart = Number(configuredStartRaw);
      if (Number.isFinite(configuredStart) && configuredStart > 0) {
        return Math.max(0, configuredStart - 1);
      }
      const latest = await provider.getBlockNumber();
      return Math.max(0, Number(latest) - 1);
    }

    if (chain.deployBlock !== null) {
      return Math.max(0, chain.deployBlock - 1);
    }

    const latest = await provider.getBlockNumber();
    return Math.max(0, Number(latest) - 1);
  };

  let lastProcessedBlock = await resolveStartingBlock();

  logger.info('Starting listener', {
    chainId: chain.id,
    network: chain.network,
    rpc: obfuscateRpcUrl(provider.rpcUrl),
    staking: stakingTarget?.address,
    poi: poiTarget?.address,
    contributions: contributionTarget?.address,
    startBlock: lastProcessedBlock + 1,
    batchSize: LISTENER_BATCH_SIZE,
    pollIntervalMs: POLL_INTERVAL_MS
  });

  const processBlock = async (blockNumber: number): Promise<void> => {
    const block = await withRetry(
      () => provider.provider.getBlock(blockNumber),
      { taskName: `${chain.id}:getBlock:${blockNumber}`, logger }
    ).catch((error: unknown) => {
      logger.error('Failed to fetch block for timestamp', { chainId: chain.id, err: error, blockNumber });
      return null;
    });
    const blockTimestampMs = Number(block?.timestamp ?? 0) * 1000;

    const transferLogs = await fetchLogs(
      chain.id,
      provider,
      chain.tokenAddress,
      [TRANSFER_TOPIC],
      blockNumber
    );
    let stakingCount = 0;
    let poiCount = 0;
    let contributionCount = 0;

    for (const log of transferLogs) {
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
        timestamp: blockTimestampMs
      }).catch((error: unknown) => {
        logger.error('Failed to write transfer log', {
          chainId: chain.id,
          err: error,
          txHash: log.transactionHash,
          logIndex
        });
      });
    }

    const stakingReady = stakingTarget && blockNumber >= stakingTarget.deployBlock;
    if (stakingReady) {
      const stakingLogs = await fetchLogs(
        chain.id,
        provider,
        stakingTarget.address,
        [[STAKED_TOPIC, UNSTAKED_TOPIC, REWARD_TOPIC]],
        blockNumber
      );

      for (const log of stakingLogs) {
        const parsed = parseStakingEvent(log);
        const logIndex = getLogIndex(log);

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
                  timestamp: blockTimestampMs
                }
              },
              { upsert: true }
            ),
          { taskName: `mongo:staking:${chain.id}:${log.transactionHash}:${logIndex}`, logger, baseDelayMs: 300 }
        ).catch((error: unknown) => {
          logger.error('Failed to write staking log', {
            chainId: chain.id,
            err: error,
            txHash: log.transactionHash,
            logIndex
          });
        });
      }

      stakingCount = stakingLogs.length;
    }

    const poiReady = poiTarget && blockNumber >= poiTarget.deployBlock;
    if (poiReady) {
      const poiLogs = await fetchLogs(
        chain.id,
        provider,
        poiTarget.address,
        [PROOF_SUBMITTED_TOPIC],
        blockNumber
      );

      for (const log of poiLogs) {
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
          logger.error('Failed to write PoI log', {
            chainId: chain.id,
            err: error,
            txHash: log.transactionHash,
            logIndex
          });
        });
      }

      poiCount = poiLogs.length;
    }

    const contributionsReady =
      contributionTarget && blockNumber >= contributionTarget.deployBlock;
    if (contributionsReady) {
      const contributionLogs = await fetchLogs(
        chain.id,
        provider,
        contributionTarget.address,
        [CONTRIBUTION_RECORDED_TOPIC],
        blockNumber
      );

      for (const log of contributionLogs) {
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
          logger.error('Failed to write contribution log', {
            chainId: chain.id,
            err: error,
            txHash: log.transactionHash,
            logIndex
          });
        });
      }

      contributionCount = contributionLogs.length;
    }

    logger.info('Stored logs for block', {
      chainId: chain.id,
      blockNumber,
      transfers: transferLogs.length,
      staking: stakingCount,
      poi: poiCount,
      contributions: contributionCount
    });
  };

  provider.provider.on('error', (error) => {
    logger.error('Provider emitted an error', { chainId: chain.id, err: error });
  });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const latestBlock = await provider.getBlockNumber();

    if (lastProcessedBlock >= latestBlock) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const targetBlock = Math.min(latestBlock, lastProcessedBlock + LISTENER_BATCH_SIZE);

    try {
      for (
        let blockNumber = lastProcessedBlock + 1;
        blockNumber <= targetBlock;
        blockNumber += 1
      ) {
        // eslint-disable-next-line no-await-in-loop
        await processBlock(blockNumber);
        lastProcessedBlock = blockNumber;
      }

      await persistLastProcessedBlock(chain.id, lastProcessedBlock);
    } catch (error) {
      logger.error('Listener batch failed', {
        chainId: chain.id,
        err: error,
        fromBlock: lastProcessedBlock + 1,
        toBlock: targetBlock
      });
    }

    await sleep(POLL_INTERVAL_MS);
  }
};
