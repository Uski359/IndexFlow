import { logger } from '../logger.js';
import { runListener } from './runListener.js';

runListener('bnb').catch((error: unknown) => {
  logger.error('BNB Chain listener failed', { chainId: 'bnb', err: error });
  process.exit(1);
});
