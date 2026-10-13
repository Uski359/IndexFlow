import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';

import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import { evaluatorService } from '../../../services/evaluatorService.js';
import { generatePolymarketPilotDataset } from '../../../mock/mockData.js';

export const getMockWallets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = req.params as { id: string };
    const query = req.query as { count?: number };

    const campaign_id = params.id;
    if (!getCampaign(campaign_id)) {
      throw createHttpError(404, `Unknown campaign_id: ${campaign_id}`);
    }

    const count = query.count ?? 320;
    
    // Use structured pilot dataset for 320 wallets (250 verified true + 70 bots)
    if (count >= 320) {
      const pilotDataset = generatePolymarketPilotDataset();
      const wallets = pilotDataset.slice(0, count).map(item => item.address);
      res.json(wallets);
    } else {
      const wallets = evaluatorService.generateMockWallets(campaign_id, count);
      res.json(wallets);
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate mock wallets');
    next(error);
  }
};

