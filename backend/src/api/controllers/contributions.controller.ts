import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { ContributionsService } from '../services/contributions.service.js';

export const getUserContributions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { address } = req.params;
    const chain = (req.query.chain as string) || undefined;
    const data = await ContributionsService.getUserContributions(address, chain);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error, address: req.params.address }, 'Failed to fetch contributions');
    next(error);
  }
};

export const getContributionLeaderboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limitQuery = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Number.isFinite(limitQuery) && limitQuery > 0 ? limitQuery : 20;
    const data = await ContributionsService.getLeaderboard(limit);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch contribution leaderboard');
    next(error);
  }
};
