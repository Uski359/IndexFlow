import createHttpError from 'http-errors';
import { ZodError } from 'zod';

export function createValidationError(error: ZodError) {
  return createHttpError(400, 'Validation failed', {
    errors: error.flatten()
  });
}

export function createNotFoundError(entity: string, id: string | number) {
  return createHttpError(404, `${entity} with id ${id} not found`);
}
