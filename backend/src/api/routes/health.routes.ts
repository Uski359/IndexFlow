import { Router } from 'express';

import { getIndexerHealth } from '../controllers/health.controller.js';

const healthRouter = Router();

healthRouter.get('/', getIndexerHealth);

export default healthRouter;
