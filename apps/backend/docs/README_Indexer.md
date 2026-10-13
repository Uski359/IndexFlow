# IndexFlow Indexer

A production-ready, multi-chain log indexer for the IndexFlow token with rate limiting, retries, and structured logging.

## Prerequisites
- Node 18+
- MongoDB reachable at `MONGO_URL`
- RPC endpoints per chain you plan to run (e.g., `SEPOLIA_RPC`)

## Environment
Set the following in your `.env` (see `.env.example` for defaults):
- `MONGO_URL` / `MONGO_DB`
- `INDEXFLOW_TOKEN_ADDRESS=0x93b95F6956330f4a56E7A94457A7E597a7340E61`
- RPC pools per chain (supports up to 3 each): `SEPOLIA_RPC_[1-3]`, `ETHEREUM_RPC_[1-3]`, `POLYGON_RPC_[1-3]`, `ARBITRUM_RPC_[1-3]`, `BASE_RPC_[1-3]`, `BNB_RPC_[1-3]`
- `INDEXER_LOG_LEVEL` (debug|info|warn|error), `INDEXER_LOG_DIR` (default `./logs`)
- `INDEXER_BATCH_SIZE` (optional, defaults to 200)

## Chain configuration
All chain configs live in `src/indexer/chains/` and define `id`, `network`, `rpcEnvKey`, `tokenAddress`, and `deployBlock`. Update `tokenAddress` + `deployBlock` before running a backfill to avoid full-chain scans.

## Running workers
```bash
cd backend
npm run indexer:backfill:sepolia     # historical sync
npm run indexer:listener:sepolia     # live listener
npm run indexer:listener:all         # run all listeners concurrently
npm run indexer:backfill:core        # sepolia + ethereum only (sequential)
npm run indexer:backfill:all         # all configured chains (sequential)
```

Other chains ship with runnable scaffolds:
```bash
npx ts-node --esm -r tsconfig-paths/register src/indexer/backfill/polygon.backfill.ts
npx ts-node --esm -r tsconfig-paths/register src/indexer/listener/arbitrum.listener.ts
```
Configure the corresponding `RPC` and `deployBlock` values before using them.

## Architecture
- **Parsers**: `src/indexer/parsers/erc20.ts` (ethers v6 Interface).
- **Providers**: `src/indexer/services/provider.ts` wraps `JsonRpcProvider` with Bottleneck (3 req/s) and exponential backoff retries (max 5 attempts, timeout guarded).
- **DB**: `src/indexer/db/mongo.ts` creates a shared Mongo connection and retries writes.
- **Workers**: Backfill and listener scripts per chain under `src/indexer/backfill` and `src/indexer/listener`.
- **Logging**: `src/indexer/logger.ts` (winston) with daily-rotated files plus console output; log files land in `INDEXER_LOG_DIR`.
- **Utilities**: `src/indexer/utils/retry.ts` for reusable exponential backoff.

Path alias `@indexer/*` is available via `tsconfig` for cleaner imports.

## Resilience & safety
- Exponential backoff (max 5 attempts) on RPC reads and Mongo writes.
- Bottleneck throttling at 3 req/s to prevent RPC bans; queued requests auto-drain.
- Failed block/range fetches are logged and skipped to avoid stalling listeners.

## Multi-Chain Mode
- Populate RPC pools in `.env` for each chain (`*_RPC_1`, `*_RPC_2`, `*_RPC_3`). Sepolia has public defaults; others are left blank.
- Set `tokenAddress` and `deployBlock` in `src/indexer/chains/*.ts` (see TODO comments). Backfill refuses to run without them.
- Run a targeted backfill: `npm run indexer:backfill:polygon` (or any chain id).
- Start all listeners in parallel: `npm run indexer:listener:all`.
- Logs are tagged per chain: backfill logs include `chainId`, `fromBlock`, `toBlock`, and counts; listener startup logs emit `chainId`, `network`, and a masked RPC URL. Failovers are WARN-level with the failing endpoint masked.
