import { logger } from '../logger.ts';
import { runListener } from './runListener.ts';

runListener('ethereum').catch((error: unknown) => {
  logger.error('Ethereum listener failed', { chainId: 'ethereum', err: error });
  process.exit(1);
});
