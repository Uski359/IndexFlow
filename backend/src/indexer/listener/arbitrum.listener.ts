import { getChainConfig } from '../chains/index.ts';
import { logger } from '../logger.ts';
import { runListener } from './runListener.ts';

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
