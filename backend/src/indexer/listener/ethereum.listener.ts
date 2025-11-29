import { logger } from '../logger';
import { runListener } from './runListener';

runListener('ethereum').catch((error: unknown) => {
  logger.error('Ethereum listener failed', { chainId: 'ethereum', err: error });
  process.exit(1);
});
