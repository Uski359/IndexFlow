import type { Filter, Document } from 'mongodb';

import type {
  ContributionDTO,
  ContributionLeaderboardEntry
} from '../dtos/contributions.dto.js';
import { getContributionsCollection, type ContributionDocument } from '../../indexer/db/mongo.js';

const mapContribution = (doc: ContributionDocument): ContributionDTO => ({
  chain: doc.chain,
  user: doc.user,
  contributionType: doc.contributionType,
  weight: doc.weight,
  timestamp: doc.timestamp,
  txHash: doc.txHash,
  block: doc.block
});

export class ContributionsService {
  static async getUserContributions(address: string, chain?: string): Promise<ContributionDTO[]> {
    const collection = await getContributionsCollection();
    const match: Filter<ContributionDocument> = { user: address };
    if (chain) {
      match.chain = chain;
    }

    const docs = await collection
      .find(match)
      .sort({ block: -1, _id: -1 })
      .limit(100)
      .toArray();

    return docs.map(mapContribution);
  }

  static async getLeaderboard(limit = 20): Promise<ContributionLeaderboardEntry[]> {
    const collection = await getContributionsCollection();

    const pipeline: Document[] = [
      { $group: { _id: '$user', totalWeight: { $sum: { $toDouble: '$weight' } } } },
      { $sort: { totalWeight: -1 } },
      { $limit: limit },
      { $project: { _id: 0, user: '$_id', totalWeight: { $toString: '$totalWeight' } } }
    ];

    const docs = await collection.aggregate<ContributionLeaderboardEntry>(pipeline).toArray();
    return docs;
  }
}
