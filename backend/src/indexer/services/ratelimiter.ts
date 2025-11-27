import Bottleneck from 'bottleneck';

import { logger } from '../logger.ts';

export const createRpcLimiter = (chainId: string): Bottleneck => {
  const limiter = new Bottleneck({
    reservoir: 10,
    reservoirRefreshAmount: 10,
    reservoirRefreshInterval: 1_000,
    maxConcurrent: 2
  });

  limiter.on('queued', () => {
    logger.debug('RPC request queued due to rate limit', {
      chainId,
      queueSize: limiter.queued()
    });
  });

  limiter.on('depleted', () => {
    logger.warn('RPC rate limit reservoir depleted; delaying new requests', { chainId });
  });

  limiter.on('error', (error) => {
    logger.error('Rate limiter encountered an error', { err: error, chainId });
  });

  limiter.on('failed', (error) => {
    logger.error('Rate limited job failed', { err: error, chainId });
  });

  return limiter;
};
