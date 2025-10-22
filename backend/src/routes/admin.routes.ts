import { Router } from 'express';

import {
  getOracleHandler,
  getParametersHandler,
  updateOracleHandler,
  updateParametersHandler,
  registerDatasetHandler
} from '../controllers/adminController.js';
import { requireAdminWallet } from '../middleware/requireAdminWallet.js';
import { auditAdminAction } from '../middleware/auditTrail.js';
import {
  updateOracleSchema,
  updateParametersSchema,
  registerDatasetSchema
} from '../schema/adminSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/parameters', requireAdminWallet, auditAdminAction, getParametersHandler);
router.post(
  '/parameters',
  requireAdminWallet,
  auditAdminAction,
  validateRequest(updateParametersSchema),
  updateParametersHandler
);

router.get('/oracle', requireAdminWallet, auditAdminAction, getOracleHandler);
router.post(
  '/oracle',
  requireAdminWallet,
  auditAdminAction,
  validateRequest(updateOracleSchema),
  updateOracleHandler
);
router.post(
  '/datasets/register',
  requireAdminWallet,
  auditAdminAction,
  validateRequest(registerDatasetSchema),
  registerDatasetHandler
);

export default router;
