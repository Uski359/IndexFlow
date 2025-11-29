import { getChainConfig } from '../chains/index';
import { logger } from '../logger';
import { runBackfill } from './runBackfill';

const chainId = 'polygon';
const config = getChainConfig(chainId);

if (!config.tokenAddress || config.deployBlock === null) {
  logger.warn('Skipping Polygon backfill: tokenAddress/deployBlock not configured');
  process.exit(0);
}

runBackfill(chainId).catch((error: unknown) => {
  logger.error('Polygon backfill failed', { chainId, err: error });
  process.exit(1);
});
