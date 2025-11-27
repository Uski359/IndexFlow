import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { StakingService } from '../services/staking.service.js';

export const getUserStaking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const chain = (req.query.chain as string) || undefined;
    const data = await StakingService.getUserStakingInfo(address, chain);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error, address: req.params.address }, 'Failed to fetch staking info');
    next(error);
  }
};

export const getGlobalStaking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const data = await StakingService.getGlobalStakingStats(chain);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch global staking stats');
    next(error);
  }
};
