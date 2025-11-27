import type { Filter } from 'mongodb';

import type { ProofDTO } from '../dtos/poi.dto.js';
import { getPoiEventsCollection, type PoiEventDocument } from '../../indexer/db/mongo.js';

const mapProof = (doc: PoiEventDocument): ProofDTO => ({
  chain: doc.chain,
  operator: doc.operator,
  chainId: doc.chainId,
  fromBlock: doc.fromBlock,
  toBlock: doc.toBlock,
  proofHash: doc.proofHash,
  timestamp: doc.timestamp,
  block: doc.block,
  txHash: doc.txHash
});

export class PoiService {
  static async getOperatorProofs(address: string, chain?: string): Promise<ProofDTO[]> {
    const collection = await getPoiEventsCollection();
    const match: Filter<PoiEventDocument> = { operator: address };
    if (chain) {
      match.chain = chain;
    }

    const docs = await collection
      .find(match)
      .sort({ block: -1, _id: -1 })
      .limit(50)
      .toArray();

    return docs.map(mapProof);
  }

  static async getRecentProofs(chain?: string): Promise<ProofDTO[]> {
    const collection = await getPoiEventsCollection();
    const match: Filter<PoiEventDocument> = {};
    if (chain) {
      match.chain = chain;
    }

    const docs = await collection
      .find(match)
      .sort({ block: -1, _id: -1 })
      .limit(50)
      .toArray();

    return docs.map(mapProof);
  }
}
