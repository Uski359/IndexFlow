import { Router } from 'express';

import { listStakesHandler, stakeHandler, unstakeHandler } from '../controllers/stakeController.js';
import { stakeSchema, unstakeSchema } from '../schema/stakeSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', listStakesHandler);
router.post('/', validateRequest(stakeSchema), stakeHandler);
router.post('/unstake', validateRequest(unstakeSchema), unstakeHandler);

export default router;
