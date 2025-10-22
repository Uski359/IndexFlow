import { Router } from 'express';

import { verificationCallbackHandler } from '../controllers/dataController.js';
import { verificationSchema } from '../schema/dataSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { verifyValidatorSignature } from '../middleware/verifyValidatorSignature.js';

const router = Router();

router.post(
  '/callback',
  validateRequest(verificationSchema),
  verifyValidatorSignature,
  verificationCallbackHandler
);

export default router;
