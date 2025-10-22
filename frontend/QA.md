# IndexFlow Frontend QA Checklist

## Prerequisites

- Backend, validator microservice, PostgreSQL, and ElasticSearch running (e.g. `docker compose -f ops/docker-compose.yml up --build`).
- Backend `.env` configured with live contract addresses and `DATA_VALIDATOR_API_KEY`.
- Validator microservice `.env` includes matching `VALIDATOR_API_KEY`.
- Browser wallet (MetaMask or similar) connected to the target chain and funded with test IFLW tokens.

## Smoke Tests

1. **Health Widget**
   - Visit `/`.
   - Confirm the status badge reports "Validators synced" when all services are reachable.
   - Shut down the validator container and ensure the badge reports degraded status.

2. **Dataset Search**
   - Navigate to `/search`.
   - Run a query; verify SQL preview renders and datasets list is populated from the backend.
   - Stop the backend container briefly; confirm an error toast appears.

3. **Dataset Submission**
   - Navigate to `/submit`.
   - Submit a dataset with JSON sample and optional schema.
   - Ensure validator warning messages appear when the microservice returns issues.

4. **Staking Workflow**
   - Navigate to `/stake`.
   - Create a new stake, verify positions table refreshes.
   - Toggle validator container off; confirm staking table displays an error instead of silently falling back.
   - Claim rewards and ensure toast indicates success.

   5. **Curator Dashboard**
   - Navigate to `/curate`.
   - Confirm pending datasets list renders (seed data may be required).
   - Submit a proof via the proof form and verify the form closes on success.
   - With validator offline, ensure error banners appear for dataset and challenge tables.

6. **Validator Proof Jobs**
   - Using the backend API, schedule a proof (`POST /api/validator/proof/schedule`).
   - Reload `/curate`, verify no front-end errors and job appears in the validator queue (via backend or validator logs).

7. **Error Handling**
   - With backend offline, load `/stake` and `/curate`; confirm descriptive error messages appear instead of empty screens.

## Regression Checklist

- `npm run lint --prefix frontend`
- `npm run typecheck --prefix frontend`
- `npm run test --prefix backend`
- `npm run test --prefix contracts`

Record results in release notes and attach API/validator logs for failures.
