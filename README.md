# IndexFlow

**IndexFlow** is a production-grade, reliability-first on-chain data infrastructure designed to deliver **deterministic usage verification** under real-world conditions.

Rather than optimizing for dashboards or surface-level analytics, IndexFlow prioritizes **correctness, durability, and replayability** from day one — ensuring that usage data remains verifiable across restarts, retries, short chain reorganizations, and RPC failures.

IndexFlow separates **cryptographic proof** from **human interpretation**, enabling both machine-verifiable guarantees and readable insights **without compromising determinism**.

---

## What IndexFlow Enables

IndexFlow can be used to:

- Verify real on-chain usage for airdrops and incentive campaigns  
- Distinguish organic users from farming behavior  
- Provide deterministic usage proofs for grants and ecosystem programs  
- Power analytics, dashboards, and data products on top of reliable indexed data  

---

## ✨ Core Capabilities

### Deterministic Verification
- Canonical, reproducible usage evaluation per wallet and time window  
- Proof hashes derived from normalized inputs (wallet, window, criteria)  
- Cache-first execution keyed by proof hash  

### Reliability-First Indexing
- Restart-safe indexing with persistent checkpoints  
- Idempotent ingestion using `(chainId, txHash, logIndex)`  
- Reorg-tolerant architecture with sliding safety windows  
- Batch-based indexing with safe resumption  
- Manual, resumable historical backfills  

### Insights & Interpretation (Non-Proof)
- Deterministic Insights layer:
  - Activity score (0–100)
  - Farming probability (%)
  - Behavioral tagging (organic / suspected_farm / inactive / mixed)
- Optional AI commentary layer:
  - Cached by proof hash
  - Clearly separated from verification
  - Never affects proof integrity  

### Demo-Ready Interfaces
- Read-only REST APIs for campaigns and wallets  
- Live demo dashboard with:
  - Score & risk visualization
  - Quality and farming presets
  - Wallet-level drilldowns with proof hash + commentary
  - Explicit data-source labeling (run / insights / commentary)

---

## 🧠 How It Works (High Level)

1. Reads last confirmed indexer state from persistent storage  
2. Fetches logs in deterministic block batches  
3. Normalizes on-chain events (ERC-20 transfers, usage signals)  
4. Writes events idempotently to the database  
5. Persists progress after each batch  
6. Replays recent blocks safely to tolerate short reorgs  
7. Evaluates usage deterministically and derives insights  

This guarantees safe recovery after crashes or restarts **without manual intervention**.

---

## ✅ Correctness Guarantees

IndexFlow provides strong guarantees by design:

- **No duplicate events**  
  Every event is uniquely identified by `(chainId, txHash, logIndex)`.

- **Safe restarts**  
  Indexing always resumes from the last confirmed block.

- **Reorg tolerance**  
  Recent blocks are safely re-indexed without corrupting historical data.

- **Deterministic replays**  
  The same inputs always produce the same outputs and proof hashes.

---

## 📊 Monitoring & Visibility

IndexFlow exposes lightweight inspection endpoints for demos, grants, and operations:

- `GET /health`
- `GET /api/stats`

Example response:
```json
{
  "chainId": 11155111,
  "lastIndexedBlock": 9805717,
  "currentChainBlock": 9805730,
  "lag": 13,
  "totalTransfers": 1234,
  "updatedAt": "2025-01-01T12:00:00.000Z"
}
```
🗂️ Historical Backfills
IndexFlow supports manual, resumable backfills using the same deterministic ingestion logic as live indexing:

bash
Kodu kopyala
npm run indexer:backfill -- --chain sepolia --from 9800000 --to latest
Backfills:

Are safe to interrupt

Resume correctly

Do not duplicate data

🌐 Multi-Chain Readiness
IndexFlow is architected for multi-chain expansion:

Chain-aware schemas and indexer state

Unified API surface across networks

Designed for EVM chains (Ethereum, Polygon, Base, zkEVM, etc.)

No major refactor is required to add new networks.

🎯 Design Philosophy
IndexFlow intentionally prioritizes:

Correctness over features

Reliability over speed

Infrastructure maturity over UI polish

Proof first, interpretation second

This makes it suitable as a foundation for:

Analytics platforms

Airdrop and campaign verification

DeFi tooling

Ecosystem-level data services

🧪 Current Status
Live testnet deployment

Active indexing with real data

Deterministic insights and cached AI commentary

Demo-ready for events and investors

Built and maintained by a solo founder with strong execution velocity

📌 One-Line Summary
IndexFlow is a production-safe, deterministic on-chain usage verification system that cleanly separates cryptographic proof from human interpretation — built to survive restarts, reorgs, and real-world failures from day one.

Repositories
Backend: https://github.com/Uski359/indexflow-backend

Frontend (Demo): https://github.com/Uski359/indexflow-frontend
