import { logger } from '../logger';
import { runListener } from './runListener';

runListener('bnb').catch((error: unknown) => {
  logger.error('BNB Chain listener failed', { chainId: 'bnb', err: error });
  process.exit(1);
});
