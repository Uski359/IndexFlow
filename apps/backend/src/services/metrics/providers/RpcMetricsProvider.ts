import { JsonRpcProvider, getAddress, zeroPadValue } from 'ethers';

import type {
  GetWalletMetricsInput,
  IMetricsProvider,
  WalletMetricsV1
} from '../IMetricsProvider.js';
import {
  resolveRpcEnvKey,
  resolveRpcUrl
} from '../../../infra/rpc/getLatestBlock.js';
import { MetricsNotAvailableError } from '../errors.js';
import {
  areTargetsErc20Tagged,
  toUnixSeconds,
  resolveTargets
} from '../providerInput.js';

const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const DAY_SECONDS = 24 * 60 * 60;
const MAX_TARGETS = 20;
const MAX_BLOCK_RANGE = 200_000;
const LOG_BLOCK_CHUNK = 5_000;

const providerCache = new Map<string, JsonRpcProvider>();

type RpcLog = {
  transactionHash: string;
  index?: number;
  logIndex?: number;
  blockNumber: number;
};

const getProvider = (rpcUrl: string): JsonRpcProvider => {
  let provider = providerCache.get(rpcUrl);
  if (!provider) {
    provider = new JsonRpcProvider(rpcUrl);
    providerCache.set(rpcUrl, provider);
  }
  return provider;
};

const getLogIndex = (log: RpcLog): number => log.logIndex ?? log.index ?? 0;

const getTimestampForBlock = async (
  provider: JsonRpcProvider,
  blockNumber: number,
  cache: Map<number, number>
): Promise<number> => {
  if (cache.has(blockNumber)) {
    return cache.get(blockNumber)!;
  }

  const block = await provider.getBlock(blockNumber);
  if (!block) {
    throw new MetricsNotAvailableError('rpc_block_not_found');
  }

  const timestamp = Number(block.timestamp);
  cache.set(blockNumber, timestamp);
  return timestamp;
};

const findBlockAtOrBefore = async (
  provider: JsonRpcProvider,
  low: number,
  high: number,
  timestamp: number,
  cache: Map<number, number>
): Promise<number> => {
  let left = low;
  let right = high;
  let resolved = low - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    // eslint-disable-next-line no-await-in-loop
    const midTimestamp = await getTimestampForBlock(provider, mid, cache);

    if (midTimestamp <= timestamp) {
      resolved = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return resolved;
};

const findBlockAtOrAfter = async (
  provider: JsonRpcProvider,
  low: number,
  high: number,
  timestamp: number,
  cache: Map<number, number>
): Promise<number> => {
  let left = low;
  let right = high;
  let resolved = high + 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    // eslint-disable-next-line no-await-in-loop
    const midTimestamp = await getTimestampForBlock(provider, mid, cache);

    if (midTimestamp >= timestamp) {
      resolved = mid;
      right = mid - 1;
    } else {
      left = mid + 1;
    }
  }

  return resolved;
};

const collectTransferLogs = async (
  provider: JsonRpcProvider,
  target: string,
  walletTopic: string,
  fromBlock: number,
  toBlock: number
) => {
  const interactions = new Map<string, number>();

  for (let start = fromBlock; start <= toBlock; start += LOG_BLOCK_CHUNK) {
    const end = Math.min(start + LOG_BLOCK_CHUNK - 1, toBlock);

    // eslint-disable-next-line no-await-in-loop
    const fromLogs = await provider.getLogs({
      address: target,
      fromBlock: start,
      toBlock: end,
      topics: [TRANSFER_TOPIC, walletTopic]
    });

    // eslint-disable-next-line no-await-in-loop
    const toLogs = await provider.getLogs({
      address: target,
      fromBlock: start,
      toBlock: end,
      topics: [TRANSFER_TOPIC, null, walletTopic]
    });

    for (const log of [...fromLogs, ...toLogs]) {
      const key = `${log.transactionHash}:${getLogIndex(log)}`;
      interactions.set(key, Number(log.blockNumber));
    }
  }

  return interactions;
};

export class RpcMetricsProvider implements IMetricsProvider {
  async getWalletMetrics(input: GetWalletMetricsInput): Promise<WalletMetricsV1> {
    const rpcUrl = resolveRpcUrl(input.chain_id);
    if (!rpcUrl) {
      throw new MetricsNotAvailableError(
        `rpc_missing:${resolveRpcEnvKey(input.chain_id) ?? 'RPC_URL_<CHAIN>'}`
      );
    }

    const targets = resolveTargets(input);
    if (targets.length === 0) {
      throw new MetricsNotAvailableError('no_targets');
    }
    if (targets.length > MAX_TARGETS) {
      throw new MetricsNotAvailableError('rpc_range_too_large');
    }

    if (!areTargetsErc20Tagged(input.campaign_id, targets)) {
      throw new MetricsNotAvailableError('rpc_fallback_not_ready');
    }

    let normalizedWallet: string;
    try {
      normalizedWallet = getAddress(input.wallet);
    } catch {
      throw new MetricsNotAvailableError('invalid_wallet');
    }

    const provider = getProvider(rpcUrl);
    const startTimestamp = toUnixSeconds(input.start);
    const endTimestamp = toUnixSeconds(input.end);
    if (endTimestamp < startTimestamp) {
      throw new MetricsNotAvailableError('invalid_window');
    }

    const blockTimestampCache = new Map<number, number>();

    try {
      const latestBlock = await provider.getBlockNumber();
      const asOfBlock = Math.min(
        latestBlock,
        Math.max(0, Math.trunc(input.as_of_block ?? latestBlock))
      );
      const minBlock = Math.max(0, asOfBlock - MAX_BLOCK_RANGE);

      const minBlockTimestamp = await getTimestampForBlock(
        provider,
        minBlock,
        blockTimestampCache
      );
      if (startTimestamp < minBlockTimestamp) {
        throw new MetricsNotAvailableError('rpc_range_too_large');
      }

      const asOfTimestamp = await getTimestampForBlock(
        provider,
        asOfBlock,
        blockTimestampCache
      );
      const boundedEndTimestamp = Math.min(endTimestamp, asOfTimestamp);

      const fromBlock = await findBlockAtOrAfter(
        provider,
        minBlock,
        asOfBlock,
        startTimestamp,
        blockTimestampCache
      );
      const toBlock = await findBlockAtOrBefore(
        provider,
        minBlock,
        asOfBlock,
        boundedEndTimestamp,
        blockTimestampCache
      );

      if (fromBlock > toBlock) {
        return {
          tx_count: 0,
          days_active: 0,
          unique_contracts: 0
        };
      }

      if (toBlock - fromBlock > MAX_BLOCK_RANGE) {
        throw new MetricsNotAvailableError('rpc_range_too_large');
      }

      const walletTopic = zeroPadValue(normalizedWallet, 32).toLowerCase();
      const matchedLogs = new Map<string, number>();

      for (const target of targets) {
        // eslint-disable-next-line no-await-in-loop
        const targetLogs = await collectTransferLogs(
          provider,
          target,
          walletTopic,
          fromBlock,
          toBlock
        );
        for (const [key, blockNumber] of targetLogs.entries()) {
          matchedLogs.set(`${target}:${key}`, blockNumber);
        }
      }

      const days = new Set<number>();
      for (const blockNumber of matchedLogs.values()) {
        // eslint-disable-next-line no-await-in-loop
        const timestamp = await getTimestampForBlock(
          provider,
          blockNumber,
          blockTimestampCache
        );
        days.add(Math.floor(timestamp / DAY_SECONDS));
      }

      return {
        tx_count: matchedLogs.size,
        days_active: days.size,
        unique_contracts: 0
      };
    } catch (error) {
      if (error instanceof MetricsNotAvailableError) {
        throw error;
      }
      throw new MetricsNotAvailableError('rpc_query_failed', error);
    }
  }
}
