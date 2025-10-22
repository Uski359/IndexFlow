import { Router } from 'express';

import { challengeHandler, listChallengesHandler } from '../controllers/challengeController.js';
import { challengeSchema } from '../schema/challengeSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', listChallengesHandler);
router.post('/', validateRequest(challengeSchema), challengeHandler);

export default router;
