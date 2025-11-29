import { MongoClient, type Db, type Document, type WithId, type Collection } from 'mongodb';

import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';

const mongoUri =
  process.env.MONGO_URL ?? process.env.MONGO_URI ?? 'mongodb://localhost:27017/indexflow';
const mongoDbName = process.env.MONGO_DB ?? 'indexflow';
const obfuscatedUri = mongoUri.replace(/\/\/.+@/u, '//***:***@');

let client: MongoClient | undefined;
let dbPromise: Promise<Db> | undefined;

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
    chain: string;
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

export const getTransfersCollection = async (): Promise<Collection<TransferDocument>> => {
  const db = await connectDB();
  return db.collection<TransferDocument>('transfers');
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
