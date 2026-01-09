import { Router } from 'express';

import { postProofOfUsage } from '../controllers/proofOfUsage.controller.js';

const proofOfUsageRouter = Router();

proofOfUsageRouter.post('/', postProofOfUsage);

export default proofOfUsageRouter;
