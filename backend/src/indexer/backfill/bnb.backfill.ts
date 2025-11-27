import { logger } from '../logger.ts';
import { runBackfill } from './runBackfill.ts';

runBackfill('bnb').catch((error: unknown) => {
  logger.error('BNB Chain backfill failed', { chainId: 'bnb', err: error });
  process.exit(1);
});
