import type { NextFunction, Request, Response } from 'express';

import { listCampaigns } from '../../../config/campaignRegistry.js';
import { logger } from '../../../infra/config/logger.js';

export const getCampaigns = (_req: Request, res: Response, next: NextFunction) => {
  try {
    const campaigns = listCampaigns().map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      chain_id: campaign.chain_id,
      default_window: campaign.default_window,
      criteria_set_id_default: campaign.criteria_set_id_default,
      criteria_set_ids: campaign.criteria_sets?.map((criteriaSet) => criteriaSet.id) ?? [
        campaign.criteria_set_id_default
      ],
      target_count: campaign.targets.length
    }));

    res.json({ campaigns });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list campaigns');
    next(error);
  }
};

