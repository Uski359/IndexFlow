import type { IndexerHealthDTO } from '../dtos/health.dto.js';
import type { TransferDocument } from '../../indexer/db/mongo.js';
import { connectDB } from '../../indexer/db/mongo.js';
import type { IndexerStateDocument } from '../../indexer/db/state.js';
import { getProvider } from '../../indexer/services/provider.js';
import { logger } from '../../config/logger.js';

const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';

export class HealthService {
  static async getHealth(chain?: string): Promise<IndexerHealthDTO> {
    const db = await connectDB();
    const transfers = db.collection<TransferDocument>(TRANSFERS_COLLECTION);
    const chainId = chain || DEFAULT_CHAIN;

    const [latest, state] = await Promise.all([
      transfers
        .find({ chain: chainId })
        .sort({ blockNumber: -1, block: -1, _id: -1 })
        .limit(1)
        .toArray()
        .then((items) => items[0]),
      db.collection<IndexerStateDocument>('indexer_state').findOne({ chainId }, { sort: { updatedAt: -1 } })
    ]);

    const latestIndexedBlock = state?.lastProcessedBlock ?? latest?.blockNumber ?? latest?.block ?? null;

    let providerBlock: number | null = state?.currentChainBlock ?? null;
    if (providerBlock === null) {
      try {
        providerBlock = await getProvider(chainId).getBlockNumber();
      } catch (error) {
        logger.error({ err: error, chainId }, 'Failed to fetch provider block height');
      }
    }

    const lag =
      providerBlock !== null && latestIndexedBlock !== null
        ? Math.max(0, providerBlock - latestIndexedBlock)
        : null;

    const synced = lag !== null ? lag <= 1 : false;

    return {
      chain: chainId,
      latestIndexedBlock,
      providerBlock,
      currentChainBlock: providerBlock,
      lag,
      synced,
      updatedAt: state?.updatedAt ?? null
    };
  }
}
