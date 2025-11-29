import { logger } from '../logger.js';
import { runListener } from './runListener.js';

runListener('sepolia').catch((error: unknown) => {
  logger.error('Fatal error in Sepolia listener', { chainId: 'sepolia', err: error });
  process.exit(1);
});
