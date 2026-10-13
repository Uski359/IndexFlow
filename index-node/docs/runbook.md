# IndexNode Runbook

Quick steps to bring up the index-node, verify health, and operate the coordinator bridge.

## Prerequisites
- Node.js 18+
- npm 9+
- Postgres reachable at `DATABASE_URL`

## Setup
```bash
cp .env.example .env
npm install
```
Fill these in `.env`:
- `RPC_URL`, `CHAIN_ID`, `START_BLOCK`, `CONFIRMATIONS`, `BATCH_SIZE`
- `REWARDS_CONTRACT_ADDRESS` (for coordinator)
- `COORDINATOR_PRIVATE_KEY` (funded key for submissions)
- `COORDINATOR_DRY_RUN=true` if you want to log payloads without sending txs

## Build & start
```bash
npm run build
npm start
```
Or start the full stack (db, index-node, frontend, monitoring) via Docker:
```bash
powershell -ExecutionPolicy Bypass -File ./scripts/start-all.ps1   # add -RebuildImages to rebuild
# or
# pwsh ./scripts/start-all.ps1
```
This runs the GraphQL server (`/graphql`, `/health`, `/metrics`) and starts the indexer + coordinator bridge in one process.

## Monitoring
- Prometheus scrape: `GET http://<host>:4000/metrics`
- Default job in `monitoring/prometheus.yml` plus alert rules in `monitoring/alerts/index-node-rules.yml`
- Key metrics: `indexflow_last_indexed_block`, `indexflow_safe_block_number`, `indexflow_onchain_submissions_total`, `indexflow_graphql_requests_total`

## Coordinator operations
- Dry-run mode: set `COORDINATOR_DRY_RUN=true` to see payloads without sending on-chain.
- List candidate batches (ready for submission): `npm run list:ready-batches`
- Watch logs: errors are tagged with batchId and result (`ok`/`error` recorded in metrics).

## Verification checklist
1) `/health` returns the expected chainId and checkpoint.
2) `/metrics` is reachable and Prometheus scrape succeeds.
3) GraphQL sandbox (`/graphql`) returns `transfers` data with cursors.
4) `npm run list:ready-batches` shows batches with sufficient attestations before enabling real submissions.
