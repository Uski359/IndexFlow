import { NextFunction, Request, Response } from 'express';

import { createChallenge, listChallenges } from '../services/challengeService.js';

export async function listChallengesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await listChallenges();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function challengeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const challenge = await createChallenge(req.body);
    res.status(201).json(challenge);
  } catch (error) {
    next(error);
  }
}
