import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { SupplyService } from '../services/supply.service.js';

export const getSupply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const totalSupply = await SupplyService.getTotalSupply(chain);
    res.json({ success: true, data: { totalSupply } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch total supply');
    next(error);
  }
};
