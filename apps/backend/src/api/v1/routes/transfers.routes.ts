import { Router } from 'express';

import {
  getAddressTransfers,
  getLatestTransfers
} from '../controllers/transfers.controller.js';

const transfersRouter = Router();

transfersRouter.get('/latest', getLatestTransfers);
transfersRouter.get('/:address', getAddressTransfers);

export default transfersRouter;
