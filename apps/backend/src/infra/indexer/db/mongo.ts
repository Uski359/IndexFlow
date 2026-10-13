import { MongoClient, type Db, type Document, type WithId, type Collection } from 'mongodb';

import type { ReputationRecord } from '../../../database/models/Reputation.js';
import type { SybilClusterRecord } from '../../../database/models/SybilCluster.js';
import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';

const mongoUri =
  process.env.MONGO_URL ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/indexflow';
const mongoDbName = process.env.MONGO_DB ?? 'indexflow';
const obfuscatedUri = mongoUri.replace(/\/\/.+@/u, '//***:***@');

let client: MongoClient | undefined;
let dbPromise: Promise<Db> | undefined;

export const closeDB = async (): Promise<void> => {
  const connectedClient = client;
  client = undefined;
  dbPromise = undefined;
  transfersCollectionPromise = null;
  reputationsCollectionPromise = null;
  sybilClustersCollectionPromise = null;

  if (connectedClient) {
    await connectedClient.close();
  }
};

export const connectDB = async (): Promise<Db> => {
  if (dbPromise) {
    return dbPromise;
  }

  client = new MongoClient(mongoUri);

  dbPromise = withRetry(
    async () => {
      await client?.connect();
      logger.info('Connected to MongoDB', { host: obfuscatedUri });
      return client!.db(mongoDbName);
    },
    { taskName: 'mongo:connect', logger, baseDelayMs: 250 }
  );

  return dbPromise;
};

export type TransferDocument = WithId<
  Document & {
    chain?: string;
    chainId?: string;
    contractAddress?: string;
    contract_address?: string;
    blockNumber: number;
    block?: number;
    txHash: string;
    logIndex: number;
    from: string;
    to: string;
    value: string;
    timestamp?: number;
  }
>;

let transfersCollectionPromise: Promise<Collection<TransferDocument>> | null = null;

export const getTransfersCollection = async (): Promise<Collection<TransferDocument>> => {
  if (!transfersCollectionPromise) {
    transfersCollectionPromise = connectDB().then(async (db) => {
      const collection = db.collection<TransferDocument>('transfers');
      await collection.createIndex(
        { chainId: 1, txHash: 1, logIndex: 1 },
        {
          name: 'transfer_chainId_tx_log_unique',
          unique: true,
          partialFilterExpression: { chainId: { $exists: true }, logIndex: { $exists: true } }
        }
      );
      await collection.createIndex(
        { chainId: 1, contractAddress: 1, timestamp: 1, from: 1 },
        { name: 'transfer_metrics_from_idx' }
      );
      await collection.createIndex(
        { chainId: 1, contractAddress: 1, timestamp: 1, to: 1 },
        { name: 'transfer_metrics_to_idx' }
      );
      return collection;
    });
  }

  return transfersCollectionPromise;
};

export type ReputationDocument = Document & ReputationRecord;

let reputationsCollectionPromise: Promise<Collection<ReputationDocument>> | null = null;

export const getReputationsCollection = async (): Promise<Collection<ReputationDocument>> => {
  if (!reputationsCollectionPromise) {
    reputationsCollectionPromise = connectDB().then(async (db) => {
      const collection = db.collection<ReputationDocument>('reputations');
      await collection.createIndex(
        { txHash: 1 },
        { name: 'reputation_tx_hash_unique', unique: true }
      );
      await collection.createIndex(
        { agentId: 1, chainId: 1, blockNumber: 1 },
        { name: 'reputation_agent_block_idx' }
      );
      return collection;
    });
  }

  return reputationsCollectionPromise;
};

export type SybilClusterDocument = Document & SybilClusterRecord;

let sybilClustersCollectionPromise: Promise<Collection<SybilClusterDocument>> | null = null;

export const getSybilClustersCollection = async (): Promise<
  Collection<SybilClusterDocument>
> => {
  if (!sybilClustersCollectionPromise) {
    sybilClustersCollectionPromise = connectDB().then(async (db) => {
      const collection = db.collection<SybilClusterDocument>('sybil_clusters');
      await collection.createIndex(
        { clusterId: 1 },
        { name: 'sybil_cluster_id_unique', unique: true }
      );
      await collection.createIndex({ wallets: 1 }, { name: 'sybil_cluster_wallet_idx' });
      await collection.createIndex(
        { fundingSourceAddresses: 1 },
        { name: 'sybil_cluster_funding_source_idx' }
      );
      return collection;
    });
  }

  return sybilClustersCollectionPromise;
};

export type StakingEventDocument = WithId<
  Document & {
    chain: string;
    block: number;
    txHash: string;
    logIndex: number;
    user: string;
    amount: string;
    eventType: 'STAKED' | 'UNSTAKED' | 'REWARD_CLAIMED';
    timestamp: number;
  }
>;

export const getStakingEventsCollection = async (): Promise<Collection<StakingEventDocument>> => {
  const db = await connectDB();
  return db.collection<StakingEventDocument>('staking_events');
};

export type PoiEventDocument = WithId<
  Document & {
    chain: string;
    block: number;
    operator: string;
    chainId: string;
    fromBlock: number;
    toBlock: number;
    proofHash: string;
    timestamp: number;
    txHash: string;
    logIndex: number;
  }
>;

export const getPoiEventsCollection = async (): Promise<Collection<PoiEventDocument>> => {
  const db = await connectDB();
  return db.collection<PoiEventDocument>('poi_events');
};

export type ContributionDocument = WithId<
  Document & {
    chain: string;
    block: number;
    user: string;
    contributionType: string;
    weight: string;
    timestamp: number;
    txHash: string;
    logIndex: number;
  }
>;

export const getContributionsCollection = async (): Promise<Collection<ContributionDocument>> => {
  const db = await connectDB();
  return db.collection<ContributionDocument>('contributions');
};
