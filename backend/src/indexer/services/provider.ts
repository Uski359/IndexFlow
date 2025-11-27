import { JsonRpcProvider, type Filter, type Log } from 'ethers';
import Bottleneck from 'bottleneck';

import type { ChainConfig } from '../chains/types.ts';
import { getChainConfig } from '../chains/index.ts';
import { logger } from '../logger.ts';
import { withRetry } from '../utils/retry.ts';
import { createRpcLimiter } from './ratelimiter.ts';

export interface RateLimitedProvider {
  chain: ChainConfig;
  provider: JsonRpcProvider;
  rpcUrl: string;
  getBlockNumber: () => Promise<number>;
  getLogs: (filter: Filter) => Promise<Log[]>;
}

interface ProviderContext {
  chain: ChainConfig;
  rpcPool: string[];
  currentRpcIndex: number;
  provider: JsonRpcProvider;
  limiter: Bottleneck;
}

const DEFAULT_TIMEOUT_MS = 20_000;
const providerContexts = new Map<string, ProviderContext>();

const shouldFailover = (error: unknown): boolean => {
  const code = (error as { code?: string })?.code;
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'NETWORK_ERROR' ||
    code === 'SERVER_ERROR'
  );
};

const maskRpcUrl = (url: string | undefined): string => {
  if (!url) return 'unknown';
  const sanitized = url.replace(/^https?:\/\//iu, '');
  if (sanitized.length <= 10) return '***';
  return `${sanitized.slice(0, 6)}***${sanitized.slice(-4)}`;
};

const buildRpcPool = (chain: ChainConfig): string[] => {
  const baseKey = chain.rpcEnvKey;
  const candidates = [
    process.env[`${baseKey}_1`],
    process.env[`${baseKey}_2`],
    process.env[`${baseKey}_3`],
    process.env[baseKey]
  ].filter((url): url is string => Boolean(url));

  const rpcPool = Array.from(new Set(candidates));

  if (rpcPool.length === 0) {
    throw new Error(
      `No RPC endpoints configured for ${chain.id}. Set ${baseKey}_1/${baseKey}_2/${baseKey}_3.`
    );
  }

  return rpcPool;
};

const createContext = (chain: ChainConfig): ProviderContext => {
  const rpcPool = buildRpcPool(chain);
  const limiter = createRpcLimiter(chain.id);
  const provider = new JsonRpcProvider(rpcPool[0], undefined, { staticNetwork: true });

  return {
    chain,
    rpcPool,
    currentRpcIndex: 0,
    provider,
    limiter
  };
};

const rotateProvider = (context: ProviderContext): void => {
  context.currentRpcIndex = (context.currentRpcIndex + 1) % context.rpcPool.length;
  const nextRpc = context.rpcPool[context.currentRpcIndex];
  context.provider = new JsonRpcProvider(nextRpc, undefined, { staticNetwork: true });
};

const executeWithFailover = async <T>(
  context: ProviderContext,
  taskName: string,
  handler: (prov: JsonRpcProvider) => Promise<T>
): Promise<T> => {
  let lastError: unknown;

  const limitedSchedule = async (fn: () => Promise<T>) =>
    withRetry(() => context.limiter.schedule(fn), {
      taskName,
      logger,
      timeoutMs: DEFAULT_TIMEOUT_MS
    });

  for (let attempt = 0; attempt < context.rpcPool.length; attempt += 1) {
    try {
      return await limitedSchedule(() => handler(context.provider));
    } catch (error) {
      lastError = error;

      if (!shouldFailover(error)) {
        throw error;
      }

      const failedRpc = context.rpcPool[context.currentRpcIndex];
      rotateProvider(context);
      const nextRpc = context.rpcPool[context.currentRpcIndex];

      logger.warn('RPC failed; switching endpoint', {
        chainId: context.chain.id,
        taskName,
        attempt: attempt + 1,
        failedRpc: maskRpcUrl(failedRpc),
        nextRpc: maskRpcUrl(nextRpc),
        code: (error as { code?: string })?.code
      });
    }
  }

  throw lastError instanceof Error ? lastError : new Error('RPC pool exhausted');
};

export const getProvider = (chainId: string): RateLimitedProvider => {
  const chain = getChainConfig(chainId);

  if (!providerContexts.has(chainId)) {
    providerContexts.set(chainId, createContext(chain));
  }

  const context = providerContexts.get(chainId)!;

  return {
    chain,
    get provider() {
      return context.provider;
    },
    get rpcUrl() {
      return context.rpcPool[context.currentRpcIndex];
    },
    getBlockNumber: () =>
      executeWithFailover(context, `${chain.id}:getBlockNumber`, (prov) => prov.getBlockNumber()),
    getLogs: (filter: Filter) =>
      executeWithFailover(context, `${chain.id}:getLogs`, (prov) =>
        prov.getLogs({
          ...filter,
          address: filter.address ?? chain.tokenAddress ?? undefined
        })
      )
  };
};

export const obfuscateRpcUrl = maskRpcUrl;
