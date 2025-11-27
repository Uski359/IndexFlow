import type { TransferDocument } from '../../indexer/db/mongo.js';
import { connectDB } from '../../indexer/db/mongo.js';

const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';

export class HoldersService {
  static async getHolderCount(chain?: string): Promise<number> {
    const db = await connectDB();
    const transfers = db.collection<TransferDocument>(TRANSFERS_COLLECTION);
    const chainId = chain || DEFAULT_CHAIN;

    const [result] = await transfers
      .aggregate<{ total: number }>([
        { $match: { chain: chainId } },
        {
          $group: {
            _id: null,
            holders: { $addToSet: '$to' },
            senders: { $addToSet: '$from' }
          }
        },
        {
          $project: {
            total: { $size: { $setUnion: ['$holders', '$senders'] } }
          }
        }
      ])
      .toArray();

    return result?.total ?? 0;
  }
}
