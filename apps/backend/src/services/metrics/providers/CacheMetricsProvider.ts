import type { CacheService } from '../../cacheService.js';
import { logger } from '../../../infra/config/logger.js';
import type {
  GetWalletMetricsInput,
  IMetricsProvider,
  WalletMetricsV1
} from '../IMetricsProvider.js';
import { resolveTargets, resolveWalletVariants } from '../providerInput.js';

const buildCacheKey = (input: GetWalletMetricsInput) => {
  const wallet = resolveWalletVariants(input.wallet)[0] ?? input.wallet.trim().toLowerCase();
  const targets = resolveTargets(input).sort().join(',') || 'none';
  return `metrics:v1:${input.campaign_id}:${input.chain_id}:${input.start}:${input.end}:${wallet}:${targets}`;
};

export class CacheMetricsProvider implements IMetricsProvider {
  constructor(
    private readonly cache: CacheService<WalletMetricsV1>,
    private readonly inner: IMetricsProvider
  ) {}

  async getWalletMetrics(input: GetWalletMetricsInput): Promise<WalletMetricsV1> {
    const cacheKey = buildCacheKey(input);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug({ source: 'cache', cacheKey }, 'Resolved wallet metrics');
      return cached;
    }

    const result = await this.inner.getWalletMetrics(input);
    this.cache.set(cacheKey, result);
    return result;
  }
}
