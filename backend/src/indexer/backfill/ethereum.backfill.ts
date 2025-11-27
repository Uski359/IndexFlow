import { logger } from '../logger.ts';
import { runBackfill } from './runBackfill.ts';

runBackfill('ethereum').catch((error: unknown) => {
  logger.error('Ethereum backfill failed', { chainId: 'ethereum', err: error });
  process.exit(1);
});
