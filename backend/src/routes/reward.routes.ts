import { Router } from 'express';

import {
  rewardClaimHandler,
  rewardDistributeHandler,
  rewardSummaryHandler
} from '../controllers/rewardController.js';
import { rewardClaimSchema, rewardDistributionSchema } from '../schema/rewardSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { requireAdminWallet } from '../middleware/requireAdminWallet.js';

const router = Router();

router.get('/', rewardSummaryHandler);
router.post(
  '/distribute',
  validateRequest(rewardDistributionSchema),
  requireAdminWallet,
  rewardDistributeHandler
);
router.post('/claim', validateRequest(rewardClaimSchema), rewardClaimHandler);

export default router;
