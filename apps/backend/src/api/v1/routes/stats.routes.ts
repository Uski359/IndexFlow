import { Router } from 'express';

import { getHolders } from '../controllers/holders.controller.js';
import {
  getActivityStats,
  getIndexerStats,
  getThroughputStats
} from '../controllers/stats.controller.js';
import { getSupply } from '../controllers/supply.controller.js';

const statsRouter = Router();

statsRouter.get('/', getIndexerStats);
statsRouter.get('/activity', getActivityStats);
statsRouter.get('/throughput', getThroughputStats);
statsRouter.get('/supply', getSupply);
statsRouter.get('/holders', getHolders);

export default statsRouter;
