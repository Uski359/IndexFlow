import { Router } from 'express';

import {
  getDatasetHandler,
  listDatasetsHandler,
  submitDatasetHandler
} from '../controllers/dataController.js';
import { datasetIdSchema, submitDatasetSchema } from '../schema/dataSchema.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.get('/', listDatasetsHandler);
router.post('/submit', validateRequest(submitDatasetSchema), submitDatasetHandler);
router.get('/:id', validateRequest(datasetIdSchema, 'params'), getDatasetHandler);

export default router;
