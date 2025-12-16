import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { connectDB, getTransfersCollection } from '../../indexer/db/mongo.js';
import type { IndexerStateDocument } from '../../indexer/db/state.js';
import { StatsService } from '../services/stats.service.js';

export const getIndexerStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [db, transfers] = await Promise.all([connectDB(), getTransfersCollection()]);
    const [states, transferGroups] = await Promise.all([
      db.collection<IndexerStateDocument>('indexer_state').find({}).toArray(),
      transfers
        .aggregate<{ _id: string | null; totalTransfers: number }>([
          {
            $group: {
              _id: { $ifNull: ['$chain', '$chainId'] },
              totalTransfers: { $sum: 1 }
            }
          }
        ])
        .toArray()
    ]);

    const transfersByChain = new Map<string, number>();
    transferGroups.forEach(({ _id, totalTransfers }) => {
      if (_id === null || _id === undefined) return;
      transfersByChain.set(String(_id), totalTransfers);
    });

    const chains = states.map((state) => {
      const chainId = state.chainId ?? 'unknown';
      const lastIndexedBlock = state.lastProcessedBlock ?? null;
      const currentChainBlock = state.currentChainBlock ?? null;
      const lag =
        currentChainBlock !== null && lastIndexedBlock !== null
          ? Math.max(0, currentChainBlock - lastIndexedBlock)
          : null;

      return {
        chainId,
        lastIndexedBlock,
        currentChainBlock,
        lag,
        totalTransfers: transfersByChain.get(chainId) ?? 0,
        updatedAt: state.updatedAt ?? null
      };
    });

    transferGroups.forEach(({ _id, totalTransfers }) => {
      if (_id === null || _id === undefined) {
        return;
      }
      const chainId = String(_id);
      const exists = chains.some((item) => item.chainId === chainId);
      if (!exists) {
        chains.push({
          chainId,
          lastIndexedBlock: null,
          currentChainBlock: null,
          lag: null,
          totalTransfers,
          updatedAt: null
        });
      }
    });

    chains.sort((a, b) => (a.chainId ?? '').localeCompare(b.chainId ?? ''));

    const primary = chains[0] ?? {
      chainId: null,
      lastIndexedBlock: null,
      currentChainBlock: null,
      lag: null,
      totalTransfers: 0,
      updatedAt: null
    };

    const totalTransfers = chains.reduce((sum, item) => sum + (item.totalTransfers ?? 0), 0);

    res.json({
      chains,
      chainId: primary.chainId,
      lastIndexedBlock: primary.lastIndexedBlock,
      currentChainBlock: primary.currentChainBlock,
      lag: primary.lag,
      totalTransfers,
      updatedAt: primary.updatedAt
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch indexer stats');
    next(error);
  }
};

export const getActivityStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const activity = await StatsService.activity(chain);
    res.json({
      success: true,
      data: {
        volume24h: activity.volume24h,
        transferCount24h: activity.transferCount24h,
        series: activity.series
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch activity stats');
    next(error);
  }
};

export const getThroughputStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const transferCount24h = await StatsService.throughput(chain);
    res.json({ success: true, data: { transferCount24h } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch throughput stats');
    next(error);
  }
};
