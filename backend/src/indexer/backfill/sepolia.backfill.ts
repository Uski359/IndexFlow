import { logger } from '../logger.js';
import { runBackfill } from './runBackfill.js';

runBackfill('sepolia').catch((error: unknown) => {
  logger.error('Fatal error in Sepolia backfill', { chainId: 'sepolia', err: error });
  process.exit(1);
});
