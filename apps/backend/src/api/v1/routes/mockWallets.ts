import { Router } from 'express';

import { getMockWallets } from '../controllers/mockWallets.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
  campaignParamsSchema,
  mockWalletsQuerySchema
} from '../../schema/usageMockSchema.js';

const router = Router();

router.get(
  '/:id/mock-wallets',
  validateRequest(campaignParamsSchema, 'params'),
  validateRequest(mockWalletsQuerySchema, 'query'),
  getMockWallets
);

export default router;
