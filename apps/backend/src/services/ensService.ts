import { JsonRpcProvider } from 'ethers';

import { logger } from '../infra/config/logger.js';
import { createTTLCache } from './cacheService.js';

export type EnsResolvePayload = {
  address: string | null;
  normalized_address: string | null;
  error: string | null;
};

export type EnsResolveResponse = EnsResolvePayload & {
  name: string;
  cached: boolean;
};

const ENS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ENS_NAME_REGEX = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/;
const ENS_CACHE_MAX_ENTRIES = 5000;
const ENS_MAX_CONCURRENT = 5;

const cacheKeyFor = (name: string) => `ens:resolve:${name.toLowerCase()}`;

export const ensResolveCache = createTTLCache<EnsResolvePayload>({
  ttlMs: ENS_CACHE_TTL_MS,
  maxEntries: ENS_CACHE_MAX_ENTRIES
});

let cachedProvider: JsonRpcProvider | null = null;
let cachedProviderUrl: string | null = null;
let activeResolves = 0;
const resolveQueue: Array<() => void> = [];

const getProvider = (rpcUrl: string) => {
  if (!cachedProvider || cachedProviderUrl !== rpcUrl) {
    cachedProvider = new JsonRpcProvider(rpcUrl);
    cachedProviderUrl = rpcUrl;
  }
  return cachedProvider;
};

const acquireResolveSlot = () =>
  new Promise<() => void>((resolve) => {
    const allocate = () => {
      activeResolves += 1;
      resolve(() => {
        activeResolves = Math.max(0, activeResolves - 1);
        const next = resolveQueue.shift();
        if (next) {
          next();
        }
      });
    };

    if (activeResolves < ENS_MAX_CONCURRENT) {
      allocate();
      return;
    }

    resolveQueue.push(allocate);
  });

const withResolveSlot = async <T>(fn: () => Promise<T>): Promise<T> => {
  const release = await acquireResolveSlot();
  try {
    return await fn();
  } finally {
    release();
  }
};

export const isValidEnsName = (value: string) => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized.endsWith('.eth')) {
    return false;
  }
  if (normalized.length < 5 || normalized.length > 255) {
    return false;
  }
  return ENS_NAME_REGEX.test(normalized);
};

export const resolveEnsName = async (rawName: string): Promise<EnsResolveResponse> => {
  const name = rawName.trim().toLowerCase();
  const cached = ensResolveCache.get(cacheKeyFor(name));
  if (cached) {
    return { name, cached: true, ...cached };
  }

  const rpcUrl = process.env.RPC_URL_MAINNET?.trim();
  if (!rpcUrl) {
    return {
      name,
      address: null,
      normalized_address: null,
      cached: false,
      error: 'rpc_missing'
    };
  }

  try {
    const provider = getProvider(rpcUrl);
    const address = await withResolveSlot(() => provider.resolveName(name));

    if (!address) {
      const payload: EnsResolvePayload = {
        address: null,
        normalized_address: null,
        error: 'not_found'
      };
      ensResolveCache.set(cacheKeyFor(name), payload);
      return { name, cached: false, ...payload };
    }

    const payload: EnsResolvePayload = {
      address,
      normalized_address: address.toLowerCase(),
      error: null
    };
    ensResolveCache.set(cacheKeyFor(name), payload);
    return { name, cached: false, ...payload };
  } catch (error) {
    logger.warn({ err: error, name }, 'ENS resolver error');
    return {
      name,
      address: null,
      normalized_address: null,
      cached: false,
      error: 'resolver_error'
    };
  }
};

