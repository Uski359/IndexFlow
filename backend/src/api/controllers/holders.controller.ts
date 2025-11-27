import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { HoldersService } from '../services/holders.service.js';

export const getHolders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const totalHolders = await HoldersService.getHolderCount(chain);
    res.json({ success: true, data: { totalHolders } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch holders');
    next(error);
  }
};
