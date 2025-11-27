import { logger } from '../logger.ts';
import { runListener } from './runListener.ts';

runListener('sepolia').catch((error: unknown) => {
  logger.error('Fatal error in Sepolia listener', { chainId: 'sepolia', err: error });
  process.exit(1);
});
