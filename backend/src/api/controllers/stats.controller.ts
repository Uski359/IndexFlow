import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { StatsService } from '../services/stats.service.js';

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
