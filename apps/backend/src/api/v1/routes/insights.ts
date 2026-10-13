import { Router } from 'express';

import { postInsights } from '../controllers/insights.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { insightsRequestSchema } from '../../schema/usageMockSchema.js';

const router = Router();

router.post('/', validateRequest(insightsRequestSchema), postInsights);

export default router;
