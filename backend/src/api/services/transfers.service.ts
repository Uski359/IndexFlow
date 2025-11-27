import { type Collection } from 'mongodb';

import type { TransferDTO } from '../dtos/transfers.dto.js';
import { connectDB, type TransferDocument } from '../../indexer/db/mongo.js';

const TRANSFERS_COLLECTION = 'transfers';
const DEFAULT_CHAIN = 'sepolia';

const mapTransfer = (doc: TransferDocument): TransferDTO => ({
  chain: doc.chain,
  blockNumber: doc.blockNumber ?? doc.block ?? 0,
  txHash: doc.txHash,
  from: doc.from,
  to: doc.to,
  value: doc.value,
  timestamp: doc.timestamp ?? doc._id.getTimestamp().getTime()
});

const getCollection = async (): Promise<Collection<TransferDocument>> => {
  const db = await connectDB();
  return db.collection<TransferDocument>(TRANSFERS_COLLECTION);
};

export class TransfersService {
  static async getLatest(chain?: string): Promise<TransferDTO[]> {
    const transfers = await getCollection();
    const chainId = chain || DEFAULT_CHAIN;

    const docs = await transfers
      .find({ chain: chainId })
      .sort({ blockNumber: -1, block: -1, _id: -1 })
      .limit(50)
      .toArray();

    return docs.map(mapTransfer);
  }

  static async getByAddress(address: string, chain?: string): Promise<TransferDTO[]> {
    const transfers = await getCollection();
    const chainId = chain || DEFAULT_CHAIN;

    const docs = await transfers
      .find({
        chain: chainId,
        $or: [{ from: address }, { to: address }]
      })
      .sort({ blockNumber: -1, block: -1, _id: -1 })
      .toArray();

    return docs.map(mapTransfer);
  }
}
