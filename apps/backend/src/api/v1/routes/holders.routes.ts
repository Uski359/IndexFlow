import { Router } from 'express';

import { getHolders } from '../controllers/holders.controller.js';

const holdersRouter = Router();

holdersRouter.get('/', getHolders);

export default holdersRouter;
