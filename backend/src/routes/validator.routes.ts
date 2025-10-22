import { Router } from 'express';

import {
  generateProofHandler,
  listProofJobsHandler,
  scheduleProofHandler,
  updateProofJobHandler
} from '../controllers/validatorController.js';
import {
  proofGenerationSchema,
  proofJobParamsSchema,
  proofJobUpdateSchema,
  proofScheduleSchema
} from '../schema/validatorSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { validatorRateLimiter } from '../middleware/rateLimiter.js';
import { auditValidatorAction } from '../middleware/auditTrail.js';

const router = Router();

router.use(validatorRateLimiter);
router.post('/proof', validateRequest(proofGenerationSchema), auditValidatorAction, generateProofHandler);
router.post('/proof/schedule', validateRequest(proofScheduleSchema), auditValidatorAction, scheduleProofHandler);
router.get('/jobs', listProofJobsHandler);
router.patch(
  '/jobs/:jobId',
  validateRequest(proofJobParamsSchema, 'params'),
  validateRequest(proofJobUpdateSchema),
  auditValidatorAction,
  updateProofJobHandler
);

export default router;
