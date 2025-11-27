import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../config/logger.js';
import { PoiService } from '../services/poi.service.js';

export const getOperatorProofs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address } = req.params;
    const chain = (req.query.chain as string) || undefined;
    const data = await PoiService.getOperatorProofs(address, chain);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error, address: req.params.address }, 'Failed to fetch operator proofs');
    next(error);
  }
};

export const getRecentProofs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const chain = (req.query.chain as string) || undefined;
    const data = await PoiService.getRecentProofs(chain);
    res.json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch recent proofs');
    next(error);
  }
};
