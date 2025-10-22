import { newDb } from 'pg-mem';
import type { Pool } from 'pg';

import { resetPool, setPool } from '../../src/db/postgres.js';

export interface TestDatabase {
  pool: Pool;
  cleanup: () => Promise<void>;
}

const schemaSql = `
  CREATE TABLE IF NOT EXISTS protocol_datasets (
    id TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    metadata JSONB NOT NULL,
    status TEXT NOT NULL,
    reward NUMERIC NOT NULL,
    quality_score NUMERIC NOT NULL,
    reputation_multiplier NUMERIC NOT NULL,
    stake_boost NUMERIC NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    submitter TEXT NOT NULL,
    sql_hash TEXT,
    validator_summary JSONB,
    validated_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS protocol_verifications (
    id TEXT PRIMARY KEY,
    dataset_id TEXT REFERENCES protocol_datasets(id) ON DELETE CASCADE,
    verifier TEXT NOT NULL,
    verdict TEXT NOT NULL,
    quality_score NUMERIC NOT NULL,
    notes TEXT,
    processed_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS protocol_stakes (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    apy NUMERIC NOT NULL,
    lock_until TIMESTAMPTZ NOT NULL,
    rewards_to_claim NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS protocol_challenges (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    challenger TEXT NOT NULL,
    reason TEXT NOT NULL,
    bond NUMERIC NOT NULL,
    status TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS protocol_reward_events (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS protocol_settings (
    id TEXT PRIMARY KEY,
    base_reward NUMERIC NOT NULL,
    challenge_bond NUMERIC NOT NULL,
    validator_quorum NUMERIC NOT NULL,
    slash_percentage NUMERIC NOT NULL,
    oracle_url TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

export async function setupTestDatabase(): Promise<TestDatabase> {
  const db = newDb({
    autoCreateForeignKeyIndices: true
  });

  db.public.registerFunction({
    name: 'now',
    returns: 'timestamp',
    implementation: () => new Date()
  });

  db.public.none(schemaSql);
  db.public.none(`
    INSERT INTO protocol_settings (
      id,
      base_reward,
      challenge_bond,
      validator_quorum,
      slash_percentage,
      oracle_url
    )
    VALUES ('protocol', 150, 500, 0.67, 0.25, 'https://oracle.indexflow.network')
    ON CONFLICT (id) DO NOTHING;
  `);

  const adapter = db.adapters.createPg();
  const pool = new adapter.Pool() as unknown as Pool;

  setPool(pool);

  return {
    pool,
    cleanup: async () => {
      await pool.end();
      resetPool();
    }
  };
}
