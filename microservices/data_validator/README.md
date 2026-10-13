# IndexFlow Data Validator

FastAPI microservice that validates dataset samples, infers schema, and produces reproducible hashes for Proof of SQL.


## Configuration

- `VALIDATOR_API_KEY` (optional): Shared secret required on proof endpoints.
- `PROOF_DB_PATH`: SQLite file for persisting proof jobs (default `./proof_jobs.db`).
- `WORKER_POLL_INTERVAL`, `WORKER_RETRY_DELAY`, `WORKER_SUBMISSION_DELAY`, `WORKER_MAX_RETRIES`: Tuning knobs for the background worker.

The service now persists the proof submission queue to disk and runs a background worker that retries queued jobs.
