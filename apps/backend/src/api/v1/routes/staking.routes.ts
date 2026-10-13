import { Router } from 'express';

import { getGlobalStaking, getUserStaking } from '../controllers/staking.controller.js';

const stakingRouter = Router();

stakingRouter.get('/user/:address', getUserStaking);
stakingRouter.get('/global', getGlobalStaking);

export default stakingRouter;
