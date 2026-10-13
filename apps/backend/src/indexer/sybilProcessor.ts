import { MongoServerError, type Document, type Filter } from 'mongodb';

import { Reputation as ReputationModel, type ReputationRecord } from '../database/models/Reputation.js';
import type { SybilClusterRecord } from '../database/models/SybilCluster.js';
import {
  getReputationsCollection,
  getSybilClustersCollection,
  getTransfersCollection,
  type ReputationDocument,
  type SybilClusterDocument,
  type TransferDocument
} from '../infra/indexer/db/mongo.js';
import { logger } from '../infra/indexer/logger.js';

export interface FeedbackData {
  agentId: number | bigint;
  reviewer: string;
  rawScore: number | bigint;
  comment?: string | null;
  txHash: string;
  chainId?: string;
  blockNumber?: number | bigint;
}

interface WalletAnalytics {
  transferCount: number;
  firstSeenAt?: Date;
  fundingSource?: string;
}

interface FundingSourceAggregate extends Document {
  _id: string;
  fundingSource: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_WALLET_AGE_MS = 7 * DAY_MS;
const LOW_TRANSFER_COUNT = 4;
const BLOCK_WINDOW_SIZE = 10;
const MAX_TEMPORAL_FEEDBACK = 100;
const SYBIL_THRESHOLD = 0.7;

const normalizeAddress = (address: string): string => address.trim().toLowerCase();

const toFiniteNumber = (value: number | bigint, field: string): number => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new TypeError(`${field} must be a finite number`);
  }
  return numberValue;
};

const toSafeInteger = (value: number | bigint, field: string): number => {
  const numberValue = toFiniteNumber(value, field);
  if (!Number.isSafeInteger(numberValue) || numberValue < 0) {
    throw new TypeError(`${field} must be a non-negative safe integer`);
  }
  return numberValue;
};

const withChainScope = (
  filter: Filter<TransferDocument>,
  chainId?: string
): Filter<TransferDocument> =>
  chainId
    ? {
        $and: [filter, { $or: [{ chain: chainId }, { chainId }] }]
      }
    : filter;

const toDateFromTimestamp = (timestamp?: number): Date | undefined => {
  if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp <= 0) {
    return undefined;
  }
  return new Date(timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp);
};

const getWalletAnalytics = async (
  reviewer: string,
  chainId?: string
): Promise<WalletAnalytics> => {
  const transfers = await getTransfersCollection();
  const transferFilter = withChainScope(
    { $or: [{ from: reviewer }, { to: reviewer }] },
    chainId
  );
  const firstTransfer = await transfers.findOne(transferFilter, {
    sort: { timestamp: 1, blockNumber: 1, logIndex: 1 }
  });
  const firstInboundTransfer = await transfers.findOne(
    withChainScope({ to: reviewer }, chainId),
    { sort: { timestamp: 1, blockNumber: 1, logIndex: 1 } }
  );

  return {
    transferCount: await transfers.countDocuments(transferFilter),
    firstSeenAt: toDateFromTimestamp(firstTransfer?.timestamp),
    fundingSource: firstInboundTransfer?.from
      ? normalizeAddress(firstInboundTransfer.from)
      : undefined
  };
};

const hasRelatedFeedbackInBlockWindow = async (
  feedbackData: Pick<FeedbackData, 'agentId' | 'blockNumber'>,
  reviewer: string,
  chainId: string | undefined,
  fundingSource: string | undefined,
  clusters: SybilClusterRecord[],
  reputations: ReturnType<typeof getReputationsCollection> extends Promise<infer T> ? T : never
): Promise<boolean> => {
  if (feedbackData.blockNumber === undefined) {
    return false;
  }

  const blockNumber = toSafeInteger(feedbackData.blockNumber, 'blockNumber');
  const windowStart = Math.floor(blockNumber / BLOCK_WINDOW_SIZE) * BLOCK_WINDOW_SIZE;
  const previousFeedback = await reputations
    .find(
      {
        agentId: toSafeInteger(feedbackData.agentId, 'agentId'),
        reviewer: { $ne: reviewer },
        blockNumber: { $gte: windowStart, $lt: windowStart + BLOCK_WINDOW_SIZE },
        ...(chainId ? { chainId } : {})
      },
      { projection: { reviewer: 1 } }
    )
    .limit(MAX_TEMPORAL_FEEDBACK)
    .toArray();

  const previousReviewers = [
    ...new Set(previousFeedback.map((feedback) => normalizeAddress(feedback.reviewer)))
  ];
  if (previousReviewers.length === 0) {
    return false;
  }

  const clusterWallets = new Set(
    clusters.flatMap((cluster) => cluster.wallets.map(normalizeAddress))
  );
  if (previousReviewers.some((previousReviewer) => clusterWallets.has(previousReviewer))) {
    return true;
  }

  if (!fundingSource) {
    return false;
  }

  const transfers = await getTransfersCollection();
  const priorFundingSources = await transfers
    .aggregate<FundingSourceAggregate>([
      {
        $match: withChainScope({ to: { $in: previousReviewers } }, chainId)
      },
      { $sort: { timestamp: 1, blockNumber: 1, logIndex: 1 } },
      { $group: { _id: '$to', fundingSource: { $first: '$from' } } }
    ])
    .toArray();

  return priorFundingSources.some(
    (priorFunding) => normalizeAddress(priorFunding.fundingSource) === fundingSource
  );
};

const isDuplicateKeyError = (error: unknown): boolean =>
  error instanceof MongoServerError && error.code === 11000;

export const processReputationWithSybilFilter = async (
  feedbackData: FeedbackData
): Promise<ReputationRecord> => {
  const reviewer = normalizeAddress(feedbackData.reviewer);
  const txHash = feedbackData.txHash.trim().toLowerCase();
  const agentId = toSafeInteger(feedbackData.agentId, 'agentId');
  const rawScore = toFiniteNumber(feedbackData.rawScore, 'rawScore');
  const blockNumber =
    feedbackData.blockNumber === undefined
      ? undefined
      : toSafeInteger(feedbackData.blockNumber, 'blockNumber');
  const chainId = feedbackData.chainId?.trim().toLowerCase() || undefined;

  if (!/^0x[a-f\d]{40}$/u.test(reviewer)) {
    throw new TypeError('reviewer must be a valid EVM address');
  }
  if (!txHash) {
    throw new TypeError('txHash is required');
  }

  try {
    const reputations = await getReputationsCollection();
    const existing = await reputations.findOne({ txHash });
    if (existing) {
      logger.info('Skipped duplicate reputation feedback', { agentId, reviewer, txHash });
      return existing;
    }

    const [walletAnalytics, sybilClusters] = await Promise.all([
      getWalletAnalytics(reviewer, chainId),
      getSybilClustersCollection()
    ]);
    const clusterConditions: Filter<SybilClusterDocument>[] = [{ wallets: reviewer }];
    if (walletAnalytics.fundingSource) {
      clusterConditions.push({ fundingSourceAddresses: walletAnalytics.fundingSource });
    }
    const matchedClusters = await sybilClusters
      .find({ isActive: { $ne: false }, $or: clusterConditions })
      .toArray();

    const knownWallet = matchedClusters.some((cluster) =>
      cluster.wallets.some((wallet) => normalizeAddress(wallet) === reviewer)
    );
    const knownFundingSource = Boolean(
      walletAnalytics.fundingSource &&
        matchedClusters.some((cluster) =>
          cluster.fundingSourceAddresses.some(
            (address) => normalizeAddress(address) === walletAnalytics.fundingSource
          )
        )
    );
    const temporalPattern = await hasRelatedFeedbackInBlockWindow(
      { agentId, blockNumber },
      reviewer,
      chainId,
      walletAnalytics.fundingSource,
      matchedClusters,
      reputations
    );

    const signals: string[] = [];
    let sybilScore = 0;
    const walletAgeMs = walletAnalytics.firstSeenAt
      ? Date.now() - walletAnalytics.firstSeenAt.getTime()
      : undefined;
    if (
      walletAgeMs !== undefined &&
      walletAgeMs >= 0 &&
      walletAgeMs <= NEW_WALLET_AGE_MS &&
      walletAnalytics.transferCount < LOW_TRANSFER_COUNT
    ) {
      sybilScore += 0.4;
      signals.push('recent-first-seen-and-low-transfer-history');
    }
    if (knownWallet) {
      sybilScore += 0.8;
      signals.push('reviewer-in-known-sybil-cluster');
    }
    if (knownFundingSource) {
      sybilScore += 0.75;
      signals.push('funded-by-known-sybil-source');
    }
    if (temporalPattern) {
      sybilScore += 0.4;
      signals.push('related-feedback-in-same-block-window');
    }

    sybilScore = Math.min(1, sybilScore);
    const isSybil = sybilScore > SYBIL_THRESHOLD;
    const weightedScore = isSybil ? 0 : rawScore;
    const reputation = new ReputationModel({
      agentId,
      reviewer,
      rawScore,
      weightedScore,
      isSybil,
      sybilScore,
      comment: feedbackData.comment?.trim() ?? '',
      txHash,
      processedAt: new Date(),
      ...(chainId ? { chainId } : {}),
      ...(blockNumber !== undefined ? { blockNumber } : {})
    });
    await reputation.validate();

    const record = reputation.toObject({ versionKey: false }) as unknown as ReputationDocument;
    let inserted = false;
    try {
      const result = await reputations.updateOne({ txHash }, { $setOnInsert: record }, { upsert: true });
      inserted = result.upsertedCount > 0;
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }

    const saved = await reputations.findOne({ txHash });
    if (!saved) {
      throw new Error(`Reputation feedback ${txHash} was not persisted`);
    }

    if (inserted) {
      logger.info('Indexed ERC-8004 reputation feedback', {
        agentId,
        reviewer,
        txHash,
        rawScore,
        weightedScore,
        sybilScore,
        isSybil,
        signals
      });
    } else {
      logger.info('Skipped duplicate reputation feedback', { agentId, reviewer, txHash });
    }

    return saved;
  } catch (error) {
    logger.error('Failed to process ERC-8004 reputation feedback', {
      agentId,
      reviewer,
      txHash,
      err: error
    });
    throw error;
  }
};