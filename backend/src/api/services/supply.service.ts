import type { TransferDocument } from '../../indexer/db/mongo.js';
import { connectDB } from '../../indexer/db/mongo.js';

const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';

export class SupplyService {
  static async getTotalSupply(chain?: string): Promise<number> {
    const db = await connectDB();
    const transfers = db.collection<TransferDocument>(TRANSFERS_COLLECTION);
    const chainId = chain || DEFAULT_CHAIN;

    const [result] = await transfers
      .aggregate<{ total: number }>([
        { $match: { chain: chainId } },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: '$value' } }
          }
        }
      ])
      .toArray();

    return result?.total ?? 0;
  }
}
