# IndexFlow REST API

Express + TypeScript + ESM API layer that surfaces indexed token data from MongoDB. All modules use `.js` extensions for ESM compatibility at runtime.

## Routes
- `GET /api/transfers/latest` → last 50 transfers sorted by block desc.
- `GET /api/transfers/:address` → transfers where `from` or `to` matches the address.
- `GET /api/holders` → `{ success: true, data: { count } }` of unique holder addresses.
- `GET /api/supply` → `{ success: true, data: { totalSupply } }` summed from transfer `value`.
- `GET /api/stats/activity` → `{ success: true, data: { last24hTransfers } }` counted by indexed time.
- `GET /api/health/indexer` → `{ success: true, data: { latestBlock, indexedAt } }` from the newest transfer.

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
