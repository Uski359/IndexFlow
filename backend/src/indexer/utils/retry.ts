import { setTimeout as delay } from 'node:timers/promises';

import type { Logger } from 'winston';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  factor?: number;
  timeoutMs?: number;
  taskName?: string;
  logger?: Logger;
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([
    promise,
    delay(timeoutMs).then(() => {
      throw new Error(`Operation timed out after ${timeoutMs}ms`);
    })
  ]);

export const withRetry = async <T>(
  fn: () => Promise<T>,
  {
    attempts = 5,
    baseDelayMs = 500,
    factor = 2,
    timeoutMs,
    taskName = 'operation',
    logger
  }: RetryOptions = {}
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const resultPromise = fn();
      const resolved = timeoutMs ? await withTimeout(resultPromise, timeoutMs) : await resultPromise;
      if (attempt > 1) {
        logger?.info('Recovered after retry', { taskName, attempt });
      }
      return resolved;
    } catch (error) {
      lastError = error;

      logger?.warn(`Retrying ${taskName} (attempt ${attempt}/${attempts})`, {
        err: error,
        attempt,
        attempts,
        taskName
      });

      if (attempt === attempts) {
        break;
      }

      const delayMs = baseDelayMs * factor ** (attempt - 1);
      await delay(delayMs);
    }
  }

  logger?.error(`${taskName} failed after ${attempts} attempts`, {
    err: lastError,
    taskName
  });

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(`Unknown error in ${taskName}`);
};

export const retry = async <T>(fn: () => Promise<T>, tries = 5): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < tries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await fn();
    } catch (error) {
      lastError = error;
      const delayMs = 500 * (attempt + 1);
      // eslint-disable-next-line no-await-in-loop
      await delay(delayMs);
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error('Max retries reached');
};
