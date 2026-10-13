import { logger } from '../logger.js';
import { runListener } from './runListener.js';

runListener('ethereum').catch((error: unknown) => {
  logger.error('Ethereum listener failed', { chainId: 'ethereum', err: error });
  process.exit(1);
});
