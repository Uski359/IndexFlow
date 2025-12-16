IndexFlow

IndexFlow is a production-grade, reliability-first EVM indexing backend designed to survive real-world conditions such as restarts, retries, short chain reorganizations, and RPC failures.

Rather than focusing on dashboards or surface features, IndexFlow prioritizes correctness, durability, and infrastructure maturity from day one.

✨ Key Features

Restart-safe indexing with persistent checkpoints

Idempotent event ingestion using (chainId, txHash, logIndex)

Reorg-tolerant architecture (seed-level sliding window)

Batch-based indexing with safe resumption

Manual, resumable backfill for historical data

Real-time indexer visibility (health, lag, progress)

Chain-aware schemas ready for multi-chain expansion

Clean, read-only REST API for downstream consumers

🧠 How It Works (High Level)

Reads last processed block from persistent indexer state

Fetches logs in deterministic block batches

Normalizes ERC-20 transfer events

Writes events idempotently to the database

Persists progress after each batch

Continuously monitors indexing lag and health

This guarantees safe recovery after crashes or restarts without manual intervention.

✅ Correctness Guarantees

IndexFlow provides the following guarantees:

No duplicate events
Each transfer is uniquely identified by:

(chainId, txHash, logIndex)


Safe restarts
Indexing always resumes from the last confirmed block.

Short reorg tolerance
Recent blocks are safely re-indexed without corrupting historical data.

📊 Monitoring & Visibility

IndexFlow exposes lightweight endpoints for live inspection:

Health
GET /health

Stats
GET /api/stats


Example response:

{
  "chainId": 11155111,
  "lastIndexedBlock": 9805717,
  "currentChainBlock": 9805730,
  "lag": 13,
  "totalTransfers": 1234,
  "updatedAt": "2025-01-01T12:00:00.000Z"
}


These endpoints are designed for demos, grants, and operational monitoring.

🗂️ Backfilling Historical Data

IndexFlow supports manual, resumable backfills using the same ingestion logic as live indexing:

npm run indexer:backfill -- --chain sepolia --from 9800000 --to latest


Backfills:

Are safe to interrupt

Update indexer state correctly

Do not duplicate data

🌐 Multi-Chain Readiness

IndexFlow is architected to scale beyond a single chain:

Chain-aware schemas and state

Unified API surface across networks

Designed to support Polygon PoS, zkEVM, Base, and other EVM chains

No major refactor is required to add additional networks.

🎯 Design Philosophy

IndexFlow intentionally prioritizes:

Correctness over features

Reliability over speed

Infrastructure maturity over UI polish

This makes it suitable as a foundation for analytics platforms, explorers, DeFi tooling, and ecosystem-level data services.

🧪 Current Status

Live testnet deployment

Active indexing with real data

Seed-level production readiness

Built and maintained by a solo founder with strong execution velocity

📌 One-Line Summary

IndexFlow is a production-safe EVM indexer designed to survive restarts, reorgs, and real-world failures from day one.
