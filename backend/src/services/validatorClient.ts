import createHttpError from 'http-errors';

import { config } from '../config/env.js';

async function callValidator<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.dataValidatorUrl) {
    throw createHttpError(503, 'Validator service URL not configured');
  }

  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (config.dataValidatorApiKey) {
    headers.set('x-api-key', config.dataValidatorApiKey);
  }

  try {
    const response = await fetch(`${config.dataValidatorUrl}${path}`, {
      ...init,
      headers
    });

    if (!response.ok) {
      const detail = await response.text();
      throw createHttpError(response.status, detail || 'Validator service error');
    }

    return (await response.json()) as T;
  } catch (error) {
    if (createHttpError.isHttpError(error)) {
      throw error;
    }
    throw createHttpError(502, 'Unable to reach validator service', { cause: error });
  }
}

async function postValidator<T>(path: string, body: unknown): Promise<T> {
  return callValidator<T>(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export { callValidator, postValidator };
