import createHttpError from 'http-errors';
import { NextFunction, Request, Response } from 'express';

import { config } from '../config/env.js';

const ADMIN_HEADER = 'x-admin-wallet';

export function requireAdminWallet(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers[ADMIN_HEADER] as string | undefined;
  const wallet = header?.toLowerCase();

  if (!wallet) {
    return next(createHttpError(401, 'Admin wallet address required'));
  }

  if (config.adminWalletAddresses.length === 0) {
    return next(createHttpError(503, 'Admin wallet list not configured'));
  }

  if (!config.adminWalletAddresses.includes(wallet)) {
    return next(createHttpError(403, 'Admin wallet not authorized'));
  }

  return next();
}
