# IndexFlow REST API

Express + TypeScript + ESM API layer that surfaces indexed token data from MongoDB. All modules use `.js` extensions for ESM compatibility at runtime.

## Routes
- `GET /api/transfers/latest` → last 50 transfers sorted by block desc.
- `GET /api/transfers/:address` → transfers where `from` or `to` matches the address.
- `GET /api/holders` → `{ success: true, data: { count } }` of unique holder addresses.
- `GET /api/supply` → `{ success: true, data: { totalSupply } }` summed from transfer `value`.
- `GET /api/stats/activity` → `{ success: true, data: { last24hTransfers } }` counted by indexed time.
- `GET /api/health/indexer` → `{ success: true, data: { latestBlock, indexedAt } }` from the newest transfer.

## Proof-of-usage demo (v1)
- `GET /v1/campaigns` -> `{ campaigns: [{ id, name, chain_id, default_window, criteria_set_id_default, criteria_set_ids, target_count }] }`.
- `POST /v1/commentary` -> `{ output, insights }` -> `{ commentary, cached }`.
- `POST /v1/campaign/commentary` -> `{ campaign_id, window, wallets, mode: "sync" }` -> per-wallet output, insights, and commentary.
- Commentary is a non-proof payload and is cached by the core proof hash (plus campaign/window/criteria). It never changes the core output or proof hash.

### Reproducible evaluation snapshots
- `POST /v1/evaluate`, `POST /v1/campaign/run`, `POST /v1/campaign/insights`, and `POST /v1/campaign/commentary` accept optional `as_of_block`.
- If `as_of_block` is omitted, backend resolves `as_of_block` to the latest chain block at request start.
- Responses now include `meta.as_of_block` at top level so runs can be replayed deterministically.
- To rerun deterministically, call the same endpoint again with the same request payload and the returned `meta.as_of_block`.

### Commentary provider settings
- `COMMENTARY_PROVIDER=disabled` (default) uses deterministic template commentary.
- `COMMENTARY_PROVIDER=openai` + `OPENAI_API_KEY` enables OpenAI generation.
- Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`).

### Example responses
```json
// GET /api/transfers/latest
{
  "success": true,
  "data": [
    {
      "chain": "sepolia",
      "block": 5333123,
      "txHash": "0xabc...",
      "logIndex": 0,
      "from": "0xabc...",
      "to": "0xdef...",
      "value": "1000000000000000000"
    }
  ]
}
```

```json
// GET /api/health/indexer
{
  "success": true,
  "data": {
    "latestBlock": 5333123,
    "indexedAt": "2025-11-26T20:10:31.000Z"
  }
}
```

## Manual verification
- `curl http://localhost:4000/api/stats` to inspect per-chain stats and indexing lag.
- `curl http://localhost:4000/api/health` to confirm the latest indexed block versus the chain head.

## Required environment
- `PORT` (API port, default 4000)
- `MONGO_URL`, `MONGO_DB` (shared with the indexer)
- `INDEXFLOW_TOKEN_ADDRESS`
- Chain RPC endpoints (e.g., `SEPOLIA_RPC`, `ETHEREUM_RPC`, `POLYGON_RPC`, `ARBITRUM_RPC`, `BASE_RPC`, `BNB_RPC`)
- Optional: `INDEXER_BATCH_SIZE`, `INDEXER_LOG_LEVEL`, `INDEXER_LOG_DIR`

## Running API + indexer
```bash
cd backend
npm install

# start the API (dev)
npm run dev

# run the indexer
npm run indexer:backfill:sepolia   # historical sync
npm run indexer:listener:sepolia   # live stream
# or run listeners together
npm run indexer:multi:all
```

For production: `npm run build && npm start`.

## Notes on ESM imports
- All source imports include `.js` extensions (`import { apiRouter } from "./api/routes/index.js"`).
- Keep `type: "module"` in `package.json` and `moduleResolution: "NodeNext"` in `tsconfig` to preserve ESM behavior.
