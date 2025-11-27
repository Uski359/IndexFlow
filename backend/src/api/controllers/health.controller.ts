import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { HealthService } from '../services/health.service.js';

export const getIndexerHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const data = await HealthService.getHealth(chain);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch indexer health');
    next(error);
  }
};
