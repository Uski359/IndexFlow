import type { CacheService } from '../cacheService.js';
import { createTTLCache, DEFAULT_CACHE_TTL_MS } from '../cacheService.js';
import type { IMetricsProvider, WalletMetricsV1 } from './IMetricsProvider.js';
import { CacheMetricsProvider } from './providers/CacheMetricsProvider.js';
import { FallbackMetricsProvider } from './providers/FallbackMetricsProvider.js';
import { IndexerDbMetricsProvider } from './providers/IndexerDbMetricsProvider.js';
import { RpcMetricsProvider } from './providers/RpcMetricsProvider.js';

export type MetricsProviderDeps = {
  cache?: CacheService<WalletMetricsV1>;
};

export const createChainedMetricsProvider = (
  deps: MetricsProviderDeps = {}
): IMetricsProvider => {
  const cache =
    deps.cache ??
    createTTLCache<WalletMetricsV1>({
      ttlMs: DEFAULT_CACHE_TTL_MS
    });

  const db = new IndexerDbMetricsProvider();
  const rpc = new RpcMetricsProvider();
  const fallback = new FallbackMetricsProvider([db, rpc]);
  return new CacheMetricsProvider(cache, fallback);
};

export const metricsProvider = createChainedMetricsProvider();
