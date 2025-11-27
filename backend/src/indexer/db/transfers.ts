import type { Filter } from 'mongodb';

import { logger } from '../logger.ts';
import { withRetry } from '../utils/retry.ts';
import { getTransfersCollection, type TransferDocument } from './mongo.ts';

export interface TransferInput {
  chain: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  from: string;
  to: string;
  value: string;
  timestamp?: number | null;
}

const normalizeTimestamp = (timestamp?: number | null): number => {
  if (!timestamp || Number.isNaN(Number(timestamp))) {
    return Date.now();
  }

  const numeric = Number(timestamp);
  const isSeconds = numeric < 10_000_000_000;
  return Math.round(isSeconds ? numeric * 1000 : numeric);
};

export const saveTransfer = async (transfer: TransferInput): Promise<void> => {
  const transfers = await getTransfersCollection();
  const filter: Filter<TransferDocument> = {
    chain: transfer.chain,
    txHash: transfer.txHash,
    logIndex: transfer.logIndex
  };

  const normalizedTimestamp = normalizeTimestamp(transfer.timestamp);

  await withRetry(
    () =>
      transfers.updateOne(
        filter,
        {
          $set: {
            chain: transfer.chain,
            blockNumber: transfer.blockNumber,
            block: transfer.blockNumber,
            txHash: transfer.txHash,
            logIndex: transfer.logIndex,
            from: transfer.from,
            to: transfer.to,
            value: transfer.value,
            timestamp: normalizedTimestamp
          }
        },
        { upsert: true }
      ),
    {
      taskName: `mongo:transfers:${transfer.chain}:${transfer.txHash}:${transfer.logIndex}`,
      logger,
      baseDelayMs: 300
    }
  );
};
