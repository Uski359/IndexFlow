import type { Collection, Document, WithId } from 'mongodb';

import { connectDB } from './mongo.js';

export interface IndexerStateDocument
  extends WithId<
    Document & {
      chainId: string;
      lastProcessedBlock: number;
      currentChainBlock?: number;
      updatedAt: Date;
    }
  > {}

let stateCollectionPromise: Promise<Collection<IndexerStateDocument>> | null = null;

const getStateCollection = async (): Promise<Collection<IndexerStateDocument>> => {
  if (!stateCollectionPromise) {
    stateCollectionPromise = connectDB().then(async (db) => {
      const collection = db.collection<IndexerStateDocument>('indexer_state');
      await collection.createIndex({ chainId: 1 }, { unique: true });
      return collection;
    });
  }

  return stateCollectionPromise;
};

export const loadLastProcessedBlock = async (chainId: string): Promise<number | null> => {
  const collection = await getStateCollection();
  const doc = await collection.findOne({ chainId: `${chainId}` });
  return doc?.lastProcessedBlock ?? null;
};

export const persistLastProcessedBlock = async (
  chainId: string,
  blockNumber: number,
  currentChainBlock?: number
): Promise<void> => {
  const collection = await getStateCollection();
  const stateUpdate: {
    chainId: string;
    lastProcessedBlock: number;
    updatedAt: Date;
    currentChainBlock?: number;
  } = {
    chainId: `${chainId}`,
    lastProcessedBlock: blockNumber,
    updatedAt: new Date()
  };

  if (currentChainBlock !== undefined) {
    stateUpdate.currentChainBlock = currentChainBlock;
  }

  await collection.updateOne(
    { chainId: `${chainId}` },
    { $set: stateUpdate },
    { upsert: true }
  );
};
