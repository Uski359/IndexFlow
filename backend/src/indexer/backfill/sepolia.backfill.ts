import { logger } from '../logger.ts';
import { runBackfill } from './runBackfill.ts';

runBackfill('sepolia').catch((error: unknown) => {
  logger.error('Fatal error in Sepolia backfill', { chainId: 'sepolia', err: error });
  process.exit(1);
});
