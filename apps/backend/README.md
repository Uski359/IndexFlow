# IndexFlow Backend

Backend services for **IndexFlow**, providing deterministic on-chain usage verification with optional non-proof interpretation.

## What this repo contains

- Reliability-first EVM indexing
- Deterministic usage evaluation & proof hashing
- Insights layer (score, farming probability, behavioral tags)
- Cached AI commentary (non-proof, optional)
- Read-only REST APIs for campaigns and wallets
- First-class campaign registry with contract allowlists (`src/config/campaigns.ts`)

## Structure (High Level)

- `src/api/` — HTTP routing and controllers (`v1` + legacy)
- `src/core/` — deterministic business logic (proofs, scoring, criteria, insights)
- `src/services/` — integrations and application services (ENS, commentary, cache)
- `src/infra/` — config, DB, indexer, repositories, RPC concerns
- `src/types/` and `src/utils/` — shared types/helpers
- `docs/` — API, DB, and indexer docs

## Metrics Providers

The evaluator can switch between mock metrics and (future) RPC-backed metrics without changing APIs.

- `METRICS_MODE=mock` (default): uses deterministic mock metrics with optional dataset overrides.
- `METRICS_MODE=rpc`: uses `RpcMetricsProvider` (currently a stub) and expects chain-specific RPC URLs.

RPC environment variables (examples):
- `RPC_URL_SEPOLIA` for chain ID `11155111`
- `RPC_URL_MAINNET` for chain ID `1`
- `RPC_URL_POLYGON` for chain ID `137`

## Key Principles

- Deterministic and replayable
- Restart- and reorg-safe
- Proof and interpretation are strictly separated

## Status

- Live testnet deployment
- Demo- and seed-ready

## Related

- Umbrella repo: https://github.com/Uski359/indexflow
- Frontend demo: https://github.com/Uski359/indexflow-frontend
- Campaign config docs: `docs/campaigns.md`
