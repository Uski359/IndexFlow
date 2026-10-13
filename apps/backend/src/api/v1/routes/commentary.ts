import { Router } from 'express';

import { postCommentary } from '../controllers/commentary.controller.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import { commentaryRequestSchema } from '../../schema/usageMockSchema.js';

const router = Router();

router.post('/', validateRequest(commentaryRequestSchema), postCommentary);

export default router;
