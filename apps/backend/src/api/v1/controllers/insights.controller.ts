import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';

import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import type { UsageOutputV1 } from '../../../core/contracts/usageOutputV1.js';
import type { UsageWindowInput } from '../../../core/evaluator/evaluateUsageV1.js';
import { insightsService } from '../../../services/insightsService.js';

export const postInsights = (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      output: UsageOutputV1;
    };

    const result = insightsService.computeInsight(body.output);

    res.json({
      insights: result.insights,
      cached: result.cached
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to compute insights');
    next(error);
  }
};

export const postCampaignInsights = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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

    const result = await insightsService.runCampaignInsights({
      campaign_id: body.campaign_id,
      window: body.window,
      wallets: body.wallets,
      mode: body.mode,
      as_of_block: body.as_of_block
    });

    res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'Failed to run campaign insights');
    next(error);
  }
};

