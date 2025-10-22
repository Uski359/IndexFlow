import { Router } from 'express';

import adminRoutes from './admin.routes.js';
import challengeRoutes from './challenge.routes.js';
import dataRoutes from './data.routes.js';
import rewardRoutes from './reward.routes.js';
import searchRoutes from './search.routes.js';
import stakeRoutes from './stake.routes.js';
import verifyRoutes from './verify.routes.js';
import validatorRoutes from './validator.routes.js';

const router = Router();

router.use('/data', dataRoutes);
router.use('/admin', adminRoutes);
router.use('/verify', verifyRoutes);
router.use('/search', searchRoutes);
router.use('/stake', stakeRoutes);
router.use('/rewards', rewardRoutes);
router.use('/challenge', challengeRoutes);
router.use('/validator', validatorRoutes);

export default router;
