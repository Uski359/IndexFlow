import { getChainConfig } from '../chains/index';
import { logger } from '../logger';
import { runBackfill } from './runBackfill';

const chainId = 'base';
const config = getChainConfig(chainId);

if (!config.tokenAddress || config.deployBlock === null) {
  logger.warn('Skipping Base backfill: tokenAddress/deployBlock not configured');
  process.exit(0);
}

runBackfill(chainId).catch((error: unknown) => {
  logger.error('Base backfill failed', { chainId, err: error });
  process.exit(1);
});
