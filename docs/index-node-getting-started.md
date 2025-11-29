# Index Node – Getting Started

This walkthrough spins up the full IndexFlow stack locally (contracts + backend + frontend) and highlights the new observability and coordinator bridge features.

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- pnpm or npm workspaces (project already configured)
- A funded Sepolia RPC URL (Infura, Alchemy, etc.) for `.env`

## 1. Bootstrap environment variables

```bash
cp .env.example .env
cp index-node/.env.example index-node/.env
```

Populate:

- `index-node/.env` → `DATABASE_URL`, `RPC_URL`, `CHAIN_ID`, rate limits, etc.
- Optional coordinator bridge settings:
  - `COORDINATOR_ENABLED=true`
  - `REWARDS_CONTRACT_ADDRESS=0x…`
  - `COORDINATOR_PRIVATE_KEY=0x…`
  - `COORDINATOR_BASE_REWARD`, `COORDINATOR_REWARD_PER_TRANSFER`, `COORDINATOR_REWARD_CAP`

## 2. Run the automated stack workflow

From the monorepo root:

```bash
npm run stack:getting-started
```

The script performs:

1. `docker compose up -d db` → Postgres 16.
2. `npm run prisma:deploy --workspace index-node`
3. `npm run db:seed --workspace index-node` → inserts sample blocks/transfers/batches.
4. Starts three long-lived processes:
   - `npm run dev --workspace contracts` (Hardhat node + contracts)
   - `npm run dev --workspace index-node` (GraphQL API + indexer + coordinator bridge)
   - `npm run dev --workspace frontend`

Stop everything with `Ctrl+C` – the script forwards the signal to all children and shuts down cleanly.

## 3. Explore the API surface

### GraphQL (http://localhost:4000/graphql)

- `transfers(limit, fromTimestamp, toTimestamp, cursor)` now returns a connection (`items`, `nextCursor`) and includes the block `timestamp`.
- Blocks, batches, health, and Proof-of-SQL queries remain available.

### REST

- `GET /health` – liveness with latest checkpoint.
- `POST /proof/sql` – queues Proof-of-SQL audits.
- `GET /metrics` – Prometheus exposition (see next section).

## 4. Observability

`GET /metrics` exposes Prometheus-compatible counters/gauges:

| Metric | Description |
| --- | --- |
| `indexflow_indexed_blocks_total{chainId}` | Total blocks persisted |
| `indexflow_erc20_transfers_total{chainId}` | Total ERC-20 transfers indexed |
| `indexflow_transactions_total{chainId}` | Total transactions indexed |
| `indexflow_last_indexed_block{chainId}` / `indexflow_safe_block_number{chainId}` | Latest checkpoint & safe block |
| `indexflow_graphql_requests_total{operation,success}` | GraphQL request counts |
| `indexflow_graphql_request_duration_seconds` | Histogram of GraphQL latency |
| `indexflow_onchain_submissions_total{result}` | Coordinator submissions success/failure |

Scrape example:

```bash
curl -s http://localhost:4000/metrics
```

### Optional: run Prometheus + Grafana locally

The root `docker-compose.yml` includes ready-made monitoring services. Start them alongside the app:

```bash
docker compose up -d prometheus grafana
```

- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3001 (default credentials `admin` / `admin`)

Grafana is auto-provisioned with:

- Prometheus datasource (points to the compose service)
- An `IndexFlow Index Node` dashboard (panels for last indexed block, throughput, GraphQL volume/latency)

Dashboards are stored in `monitoring/grafana/dashboards/index-node.json`—modify or add new ones as needed.

## 5. Coordinator bridge → IndexFlowRewards

The index-node process now watches `IndexedBatch` rows and, once they satisfy the attestation threshold, submits `IndexFlowRewards.submitProof` transactions.

Key settings (all in `index-node/.env`):

- `COORDINATOR_ENABLED=true`
- `REWARDS_CONTRACT_ADDRESS=0x…`
- `COORDINATOR_PRIVATE_KEY=0x…`
- `COORDINATOR_MIN_VALID_ATTESTATIONS` (default `1`)
- `COORDINATOR_BRIDGE_INTERVAL_MS` (default `30000`)
- Reward policy:
  - `COORDINATOR_BASE_REWARD`
  - `COORDINATOR_REWARD_PER_TRANSFER`
  - `COORDINATOR_REWARD_CAP` (optional)
  - `COORDINATOR_REWARD_TOKEN_DECIMALS`

State is persisted on every batch:

| Column | Meaning |
| --- | --- |
| `IndexedBatch.rewardAmount` | Last submitted reward (wei string) |
| `onchainStatus` | `NOT_READY → PENDING → CONFIRMED/FAILED` |
| `onchainTxHash` / `onchainSubmittedAt` | Chain tracking metadata |
| `onchainError` | Last failure message (if any) |
| `lastSubmissionAttempt` | Timestamp for retries |

Metrics (`indexflow_onchain_submissions_total`) increment on every attempt to help dashboards/alerts.

## 6. Local devnet bridge (Hardhat)

Use this workflow to exercise the staking/rewards bridge without leaving your laptop.

1. **Start a local chain**
   ```bash
   npm run dev --workspace contracts
   ```
   Hardhat exposes `http://127.0.0.1:8545` (chain id `31337`, alias `hardhat`). Leave this terminal running.

2. **Deploy + fund contracts**
   ```bash
   npm run devnet:bootstrap --workspace contracts
   ```
   The script deploys `IndexFlowToken`, `IndexFlowStaking`, `IndexFlowRewards`, stakes 5 000 IFLW for the indexer account, funds the reward pool, and grants the coordinator role. A summary (addresses + private keys) is written to `contracts/deployments/localhost-devnet.json`.

3. **Configure `index-node/.env`**

   ```dotenv
   CHAIN_ID=hardhat
   RPC_URL=http://127.0.0.1:8545        # use http://host.docker.internal:8545 inside Docker
   START_BLOCK=0
   CONFIRMATIONS=0

   COORDINATOR_ENABLED=true
   REWARDS_CONTRACT_ADDRESS=<rewardsAddress>
   COORDINATOR_PRIVATE_KEY=<coordinator.privateKey>
   COORDINATOR_MIN_VALID_ATTESTATIONS=1
   COORDINATOR_TX_CONFIRMATIONS=0
   COORDINATOR_BASE_REWARD=5
   COORDINATOR_REWARD_PER_TRANSFER=0.1
   COORDINATOR_REWARD_CAP=100
   MOCK_PROVER_ADDRESS=<indexer.address>
   MOCK_ATTESTOR_ADDRESS=<attestor.address>
   ```

4. **Reset + seed Postgres**
   ```bash
   npm run prisma:deploy --workspace index-node
   npm run db:seed --workspace index-node
   ```
   The seeded batch now references `MOCK_PROVER_ADDRESS` / `MOCK_ATTESTOR_ADDRESS`, so the coordinator bridge immediately sees an attested batch to submit.

5. **Run the index node**
   ```bash
   npm run dev --workspace index-node
   ```
   With the Hardhat node and rewards contract running, you should see logs such as `Submitted PoI on-chain` once the bridge loop kicks in.

6. **Verify on-chain + database state**
   - Hardhat console:
     ```bash
     npx hardhat console --network localhost
     ```
     ```js
     const rewards = await ethers.getContractAt("IndexFlowRewards", "<rewardsAddress>");
     await rewards.proofs(ethers.id("hardhat:5599980:5599983"));
     ```
   - Postgres (via Prisma CLI):
     ```bash
     npx prisma indexedBatch.findUnique --where '{
       chainId_id: { chainId: "hardhat", id: "hardhat:5599980:5599983" }
     }'
     ```
     Expect `onchainStatus: "CONFIRMED"`, the reward amount, and the tx hash.

## 7. Seed data overview

`prisma/seed.ts` now populates:

- 4 contiguous Sepolia blocks with mock tx + ERC-20 transfers,
- A Merkle-rooted `IndexedBatch`,
- A `BatchAttestation` marked `VALID`,
- `IndexerCheckpoint` for the same range.

This allows the frontend to render meaningful charts immediately after `npm run stack:getting-started`.

---

Need a one-liner demo instead? `npm run demo` still builds + runs `docker-compose` for db + backend only; use `stack:getting-started` for the full DX experience.
