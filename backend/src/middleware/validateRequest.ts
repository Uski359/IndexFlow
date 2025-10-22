import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';

import { createValidationError } from '../utils/httpError.js';

type RequestTarget = 'body' | 'query' | 'params';

export function validateRequest(schema: ZodSchema, target: RequestTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(createValidationError(result.error));
    }

    (req as Request & Record<RequestTarget, unknown>)[target] = result.data;
    return next();
  };
}
