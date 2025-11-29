import { logger } from '../logger.js';
import { runBackfill } from './runBackfill.js';

runBackfill('ethereum').catch((error: unknown) => {
  logger.error('Ethereum backfill failed', { chainId: 'ethereum', err: error });
  process.exit(1);
});
