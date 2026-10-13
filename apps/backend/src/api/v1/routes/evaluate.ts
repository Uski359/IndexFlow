import { Router } from 'express';

import { postEvaluate } from '../controllers/evaluate.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { evaluateRequestSchema } from '../../schema/usageMockSchema.js';

const router = Router();

router.post('/', validateRequest(evaluateRequestSchema), postEvaluate);

export default router;
