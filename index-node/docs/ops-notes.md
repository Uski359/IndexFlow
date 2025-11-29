# Ops Notes

## Coordinator bridge
- Dry-run: set `COORDINATOR_DRY_RUN=true` to log payloads without sending on-chain.
- Live submissions: require `COORDINATOR_ENABLED=true`, `REWARDS_CONTRACT_ADDRESS`, and a funded `COORDINATOR_PRIVATE_KEY`.
- Ready batches: `npm run list:ready-batches` to see candidates (attestations, prover, status).

## Monitoring
- Scrape: `GET http://<host>:4000/metrics`
- Prometheus config: `monitoring/prometheus.yml`
- Alert rules: `monitoring/alerts/index-node-rules.yml`
  - `IndexerLagHigh` (>50 block lag for 5m)
  - `CoordinatorSubmissionErrors` (any error in last 5m)
  - `GraphQLErrorRateHigh` (>5% errors over 5m)

## Start/verify
See `docs/runbook.md` for full steps (env, build/start, health/metrics checks).
