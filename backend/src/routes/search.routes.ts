import { Router } from 'express';

import { searchHandler } from '../controllers/searchController.js';

const router = Router();

router.get('/', searchHandler);

export default router;
