import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';

import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import type { UsageWindowInput } from '../../../core/evaluator/evaluateUsageV1.js';
import { evaluatorService } from '../../../services/evaluatorService.js';

export const postCampaignRun = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      campaign_id: string;
      window: UsageWindowInput;
      wallets: string[];
      mode: 'sync';
      as_of_block?: number;
    };
    if (!getCampaign(body.campaign_id)) {
      throw createHttpError(404, `Unknown campaign_id: ${body.campaign_id}`);
    }

    const result = await evaluatorService.runCampaignBatch({
      campaign_id: body.campaign_id,
      window: body.window,
      wallets: body.wallets,
      mode: body.mode,
      as_of_block: body.as_of_block
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to run campaign batch');
    next(error);
  }
};

