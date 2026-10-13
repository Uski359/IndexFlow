import { Router } from 'express';

import { getSupply } from '../controllers/supply.controller.js';

const supplyRouter = Router();

supplyRouter.get('/', getSupply);

export default supplyRouter;
