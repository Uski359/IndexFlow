import { Router } from 'express';

import { getEnsResolve } from '../controllers/ens.controller.js';

const router = Router();

router.get('/resolve', getEnsResolve);

export default router;
