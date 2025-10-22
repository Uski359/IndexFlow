import { RequestHandler } from 'express';

import { auditLogger } from '../config/auditLogger.js';

export const auditAdminAction: RequestHandler = (req, _res, next) => {
  auditLogger.info({
    event: 'admin_action',
    method: req.method,
    path: req.originalUrl,
    adminWallet: (req.headers['x-admin-wallet'] as string | undefined)?.toLowerCase()
  });
  next();
};

export const auditValidatorAction: RequestHandler = (req, _res, next) => {
  auditLogger.info({
    event: 'validator_action',
    method: req.method,
    path: req.originalUrl,
    validator: (req.body?.validator as string | undefined)?.toLowerCase(),
    datasetId: req.body?.datasetId ?? req.body?.dataset_id,
    jobId: req.params?.jobId
  });
  next();
};
