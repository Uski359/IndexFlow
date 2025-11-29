import { logger } from '../logger';
import { runBackfill } from './runBackfill';

runBackfill('sepolia').catch((error: unknown) => {
  logger.error('Fatal error in Sepolia backfill', { chainId: 'sepolia', err: error });
  process.exit(1);
});
