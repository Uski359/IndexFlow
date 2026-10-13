BEGIN;

CREATE TABLE IF NOT EXISTS protocol_settings (
    id TEXT PRIMARY KEY,
    base_reward NUMERIC NOT NULL,
    challenge_bond NUMERIC NOT NULL,
    validator_quorum NUMERIC NOT NULL,
    slash_percentage NUMERIC NOT NULL,
    oracle_url TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO protocol_settings (
    id,
    base_reward,
    challenge_bond,
    validator_quorum,
    slash_percentage,
    oracle_url
) VALUES (
    'protocol',
    150,
    500,
    0.67,
    0.25,
    'https://oracle.indexflow.network'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
