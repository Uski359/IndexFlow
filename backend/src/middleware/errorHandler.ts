import type { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';

import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(createHttpError(404, `Route ${req.originalUrl} not found`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  void _next;

  const httpError = createHttpError.isHttpError(error)
    ? error
    : createHttpError(500, 'Internal server error', { cause: error });

  if (httpError.status >= 500) {
    logger.error({ err: httpError, path: req.path }, 'Unhandled error');
  } else {
    logger.warn({ err: httpError, path: req.path }, 'Client error');
  }

  res.status(httpError.status).json({
    statusCode: httpError.status,
    message: httpError.message,
    ...(httpError as { errors?: unknown }).errors ? { errors: (httpError as { errors?: unknown }).errors } : {},
    ...(config.nodeEnv === 'development' && httpError.cause
      ? { cause: (httpError.cause as Error).message ?? String(httpError.cause) }
      : {})
  });
}
