import type { TransferDocument } from '../../indexer/db/mongo.js';
import { connectDB } from '../../indexer/db/mongo.js';

const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';

const effectiveTimestampStage = [
  {
    $addFields: {
      effectiveTimestamp: {
        $ifNull: ['$timestamp', { $toLong: { $toDate: '$_id' } }]
      }
    }
  }
];

const withinLast24hStage = (cutoffMs: number) => [
  ...effectiveTimestampStage,
  {
    $match: {
      effectiveTimestamp: { $gte: cutoffMs }
    }
  }
];

export class StatsService {
  static async activity(chain?: string) {
    const db = await connectDB();
    const transfers = db.collection<TransferDocument>(TRANSFERS_COLLECTION);
    const chainId = chain || DEFAULT_CHAIN;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const [aggregate] = await transfers
      .aggregate<{ volume24h: number; transferCount24h: number }>([
        { $match: { chain: chainId } },
        ...withinLast24hStage(cutoff),
        {
          $group: {
            _id: null,
            volume24h: { $sum: { $toDouble: '$value' } },
            transferCount24h: { $sum: 1 }
          }
        }
      ])
      .toArray();

    const seriesDocs = await transfers
      .aggregate<{ _id: string; count: number }>([
        { $match: { chain: chainId } },
        ...withinLast24hStage(cutoff),
        {
          $addFields: {
            bucket: {
              $dateToString: {
                format: '%Y-%m-%dT%H:00:00Z',
                date: { $toDate: '$effectiveTimestamp' }
              }
            }
          }
        },
        { $group: { _id: '$bucket', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
      .toArray();

    const series = seriesDocs.map((item) => ({
      timestamp: item._id,
      count: item.count
    }));

    return {
      volume24h: aggregate?.volume24h ?? 0,
      transferCount24h: aggregate?.transferCount24h ?? 0,
      series
    };
  }

  static async throughput(chain?: string): Promise<number> {
    const db = await connectDB();
    const transfers = db.collection<TransferDocument>(TRANSFERS_COLLECTION);
    const chainId = chain || DEFAULT_CHAIN;
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const [result] = await transfers
      .aggregate<{ transferCount24h: number }>([
        { $match: { chain: chainId } },
        ...withinLast24hStage(cutoff),
        { $group: { _id: null, transferCount24h: { $sum: 1 } } }
      ])
      .toArray();

    return result?.transferCount24h ?? 0;
  }
}
