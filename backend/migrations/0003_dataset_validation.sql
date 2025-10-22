BEGIN;

ALTER TABLE protocol_datasets
    ADD COLUMN IF NOT EXISTS sql_hash TEXT,
    ADD COLUMN IF NOT EXISTS validator_summary JSONB,
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS protocol_datasets_sql_hash_idx ON protocol_datasets (sql_hash);
CREATE INDEX IF NOT EXISTS protocol_datasets_validated_at_idx ON protocol_datasets (validated_at);

COMMIT;
