import { NextFunction, Request, Response } from 'express';

import { listStakes, stakeTokens, unstakeTokens } from '../services/stakeService.js';

export async function listStakesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const address = typeof req.query.address === 'string' ? req.query.address : undefined;
    const items = await listStakes(address);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function stakeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const stake = await stakeTokens(req.body);
    res.status(201).json(stake);
  } catch (error) {
    next(error);
  }
}

export async function unstakeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { stakeId } = req.body as { stakeId: string };
    const stake = await unstakeTokens(stakeId);
    res.json({ stake });
  } catch (error) {
    next(error);
  }
}
