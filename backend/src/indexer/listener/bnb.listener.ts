import { logger } from '../logger.ts';
import { runListener } from './runListener.ts';

runListener('bnb').catch((error: unknown) => {
  logger.error('BNB Chain listener failed', { chainId: 'bnb', err: error });
  process.exit(1);
});
