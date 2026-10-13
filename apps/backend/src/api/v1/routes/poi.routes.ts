import { Router } from 'express';

import { getOperatorProofs, getRecentProofs } from '../controllers/poi.controller.js';

const poiRouter = Router();

poiRouter.get('/operator/:address', getOperatorProofs);
poiRouter.get('/recent', getRecentProofs);

export default poiRouter;
