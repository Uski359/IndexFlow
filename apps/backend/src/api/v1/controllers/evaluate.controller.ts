import type { NextFunction, Request, Response } from 'express';

import { logger } from '../../../infra/config/logger.js';
import type { UsageWindowInput } from '../../../core/evaluator/evaluateUsageV1.js';
import { evaluatorService } from '../../../services/evaluatorService.js';

export const postEvaluate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      wallet: string;
      campaign_id: string;
      window: UsageWindowInput;
      as_of_block?: number;
    };

    const result = await evaluatorService.evaluateWallet({
      wallet: body.wallet,
      campaign_id: body.campaign_id,
      window: body.window,
      as_of_block: body.as_of_block
    });

    res.json({
      output: result.output,
      cached: result.cached,
      meta: result.meta
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to evaluate usage');
    next(error);
  }
};

