import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';

import { logger } from '../../../infra/config/logger.js';
import { getCampaign } from '../../../config/campaignRegistry.js';
import type { UsageOutputV1 } from '../../../core/contracts/usageOutputV1.js';
import type { UsageWindowInput } from '../../../core/evaluator/evaluateUsageV1.js';
import type { InsightV1 } from '../../../core/insights/insightsV1.js';
import { commentaryService } from '../../../services/commentary/commentaryService.js';
import { insightsService } from '../../../services/insightsService.js';

export const postCommentary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      output: UsageOutputV1;
      insights: InsightV1;
    };

    const result = await commentaryService.getCommentaryForOutput(body.output, body.insights);

    res.json({
      commentary: result.commentary,
      cached: result.cached
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate commentary');
    next(error);
  }
};

export const postCampaignCommentary = async (
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

    const commentaryResults = await Promise.all(
      result.results.map(async (entry) => {
        const commentaryResult = await commentaryService.getCommentaryForOutput(
          entry.output,
          entry.insights
        );

        return {
          wallet: entry.wallet,
          output: entry.output,
          insights: entry.insights,
          commentary: commentaryResult.commentary,
          cached_core: entry.cached_core,
          cached_insights: entry.cached_insights,
          cached_commentary: commentaryResult.cached
        };
      })
    );

    res.json({
      campaign_id: result.campaign_id,
      window: result.window,
      meta: result.meta,
      results: commentaryResults,
      summary: result.summary
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to run campaign commentary');
    next(error);
  }
};

