import type { IndexerHealthDTO } from '../dtos/health.dto.js';
import type { TransferDocument } from '../../indexer/db/mongo.js';
import { connectDB } from '../../indexer/db/mongo.js';
import { getProvider } from '../../indexer/services/provider.ts';
import { logger } from '../../config/logger.js';

const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';

export class HealthService {
  static async getHealth(chain?: string): Promise<IndexerHealthDTO> {
    const db = await connectDB();
    const transfers = db.collection<TransferDocument>(TRANSFERS_COLLECTION);
    const chainId = chain || DEFAULT_CHAIN;

    const [latest] = await transfers
      .find({ chain: chainId })
      .sort({ blockNumber: -1, block: -1, _id: -1 })
      .limit(1)
      .toArray();

    const latestIndexedBlock = latest?.blockNumber ?? latest?.block ?? null;

    let providerBlock: number | null = null;
    try {
      providerBlock = await getProvider(chainId).getBlockNumber();
    } catch (error) {
      logger.error({ err: error, chainId }, 'Failed to fetch provider block height');
    }

    const synced =
      latestIndexedBlock !== null && providerBlock !== null
        ? latestIndexedBlock >= providerBlock - 1
        : false;

    return {
      chain: chainId,
      latestIndexedBlock,
      providerBlock,
      synced
    };
  }
}
