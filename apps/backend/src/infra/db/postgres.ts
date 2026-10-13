import { Pool } from 'pg';

import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

let pool: Pool | null = null;
let overridePool: Pool | null = null;

export function setPool(externalPool: Pool) {
  overridePool = externalPool;
  pool = externalPool;
}

export async function closePool() {
  if (pool && !overridePool) {
    await pool.end();
  }
  pool = null;
  overridePool = null;
}

export function resetPool() {
  pool = null;
  overridePool = null;
}

export function getPool() {
  if (overridePool) {
    return overridePool;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.postgresUrl,
      max: 10,
      idleTimeoutMillis: 30_000
    });

    pool.on('error', (error: Error) => {
      logger.error({ err: error }, 'Unexpected PostgreSQL error');
    });
  }

  return pool;
}
