import { logger } from '../logger';
import { runBackfill } from './runBackfill';

runBackfill('ethereum').catch((error: unknown) => {
  logger.error('Ethereum backfill failed', { chainId: 'ethereum', err: error });
  process.exit(1);
});
