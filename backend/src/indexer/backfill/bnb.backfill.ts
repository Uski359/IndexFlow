import { logger } from '../logger';
import { runBackfill } from './runBackfill';

runBackfill('bnb').catch((error: unknown) => {
  logger.error('BNB Chain backfill failed', { chainId: 'bnb', err: error });
  process.exit(1);
});
