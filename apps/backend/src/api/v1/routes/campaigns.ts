import { Router } from 'express';

import { getCampaigns } from '../controllers/campaigns.controller.js';

const router = Router();

router.get('/', getCampaigns);

export default router;

