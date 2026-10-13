import { logger } from '../logger.js';
import { runBackfill } from './runBackfill.js';

runBackfill('bnb').catch((error: unknown) => {
  logger.error('BNB Chain backfill failed', { chainId: 'bnb', err: error });
  process.exit(1);
});
