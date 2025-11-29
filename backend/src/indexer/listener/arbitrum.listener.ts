import { getChainConfig } from '../chains/index';
import { logger } from '../logger';
import { runListener } from './runListener';

const chainId = 'arbitrum';
const config = getChainConfig(chainId);

if (!config.tokenAddress || config.deployBlock === null) {
  logger.warn('Skipping Arbitrum listener: tokenAddress/deployBlock not configured');
  process.exit(0);
}

runListener(chainId).catch((error: unknown) => {
  logger.error('Arbitrum listener failed', { chainId, err: error });
  process.exit(1);
});
