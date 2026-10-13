BEGIN;

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
    submitter TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS protocol_datasets_submitter_idx ON protocol_datasets (submitter);
CREATE INDEX IF NOT EXISTS protocol_datasets_status_idx ON protocol_datasets (status);

CREATE TABLE IF NOT EXISTS protocol_verifications (
    id TEXT PRIMARY KEY,
    dataset_id TEXT REFERENCES protocol_datasets(id) ON DELETE CASCADE,
    verifier TEXT NOT NULL,
    verdict TEXT NOT NULL,
    quality_score NUMERIC NOT NULL,
    notes TEXT,
    processed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS protocol_verifications_dataset_idx
  ON protocol_verifications (dataset_id);

CREATE TABLE IF NOT EXISTS protocol_stakes (
    id TEXT PRIMARY KEY,
    address TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL,
    apy NUMERIC NOT NULL,
    lock_until TIMESTAMPTZ NOT NULL,
    rewards_to_claim NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS protocol_stakes_address_idx ON protocol_stakes (address);
CREATE INDEX IF NOT EXISTS protocol_stakes_lock_until_idx ON protocol_stakes (lock_until);

CREATE TABLE IF NOT EXISTS protocol_challenges (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL,
    challenger TEXT NOT NULL,
    reason TEXT NOT NULL,
    bond NUMERIC NOT NULL,
    status TEXT NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS protocol_challenges_entry_idx ON protocol_challenges (entry_id);

CREATE TABLE IF NOT EXISTS protocol_reward_events (
    id TEXT PRIMARY KEY,
    dataset_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

COMMIT;
