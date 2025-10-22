import createHttpError from 'http-errors';
import { NextFunction, Request, Response } from 'express';

import {
  getRewardSummary,
  recordRewardClaim,
  recordRewardDistribution
} from '../services/rewardService.js';

export async function rewardSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await getRewardSummary(req.query.address as string | undefined);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

export async function rewardDistributeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const event = await recordRewardDistribution(req.body);
    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

export async function rewardClaimHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { address } = req.body as { address?: string };
    if (!address) {
      throw createHttpError(400, 'address is required');
    }
    const summary = await recordRewardClaim(address);
    res.json(summary);
  } catch (error) {
    next(error);
  }
}
