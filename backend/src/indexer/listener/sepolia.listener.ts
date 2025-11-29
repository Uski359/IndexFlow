import { logger } from '../logger';
import { runListener } from './runListener';

runListener('sepolia').catch((error: unknown) => {
  logger.error('Fatal error in Sepolia listener', { chainId: 'sepolia', err: error });
  process.exit(1);
});
