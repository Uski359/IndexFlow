# IndexFlow Monorepo

IndexFlow is a decentralized protocol for indexing on-chain and off-chain datasets. Contributors upload structured datasets, validators stake IFLW to verify Proof of SQL attestations, and consumers query the elastic index with low-latency semantic search.

## Repository Layout

| Path | Description |
| --- | --- |
| `frontend/` | Next.js + Tailwind UI with Wagmi wallet integration and nine core pages (search, submit, curate, stake, admin, etc.). |
| `backend/` | TypeScript Express API exposing IndexFlow REST endpoints with PostgreSQL and ElasticSearch hooks and mock data providers. |
| `contracts/` | Hardhat workspace containing the IFLW ERC20 staking token, data registry, and DAO controller contracts with tests. |
| `microservices/data-validator/` | FastAPI service that validates dataset samples, infers schema, and generates deterministic hashes. |

## Prerequisites

- Node.js 18+ and npm 9+
- Python 3.10+ with `venv`
- PostgreSQL 14+ (local or remote)
- ElasticSearch 8+ (for full search functionality)
- An Ethereum testnet RPC endpoint (e.g., Sepolia) for smart contract deployment

## Quick Start

```bash
# install dependencies per workspace
npm install --prefix frontend
npm install --prefix backend
npm install --prefix contracts

# bootstrap python microservice
python -m venv .venv && .\.venv\Scripts\activate
pip install -r microservices/data-validator/requirements.txt
```

Create environment files based on the provided `*.env.example` templates inside each workspace.

## Frontend (`frontend/`)

```bash
cp frontend/.env.example frontend/.env.local
npm run dev --prefix frontend
```

- Populate the `NEXT_PUBLIC_STAKE_TOKEN_ADDRESS`, `NEXT_PUBLIC_REWARD_TOKEN_ADDRESS`, and `NEXT_PUBLIC_STAKE_CONTRACT_ADDRESS` values with your live contracts (the repo includes defaults for Sepolia).
- Populate the optional `NEXT_PUBLIC_INDEXFLOW_TOKEN_ADDRESS`, `NEXT_PUBLIC_INDEXFLOW_DATA_ADDRESS`, and `NEXT_PUBLIC_INDEXFLOW_DAO_ADDRESS` values after syncing new deployments.
- `NEXT_PUBLIC_CHAIN_ID` should match the network the tokens live on (e.g., `11155111` for Sepolia).

- Next.js App Router with Tailwind and reusable UI primitives.
- Wagmi + ethers ensures wallet connectivity for staking, profile, and admin flows.
- Mock statistics, datasets, and rewards are located in `src/lib/mockData.ts` until the backend goes live.

## Backend API (`backend/`)

```bash
cp backend/.env.example backend/.env
npm run dev --prefix backend
```

Key features:

- Reads chain configuration from `.env` (`STAKE_TOKEN_ADDRESS`, `REWARD_TOKEN_ADDRESS`, `STAKE_CONTRACT_ADDRESS`, `CHAIN_ID`, `CHAIN_RPC_URL`) so you can point the API at live contracts. Optional values `INDEXFLOW_TOKEN_ADDRESS`, `INDEXFLOW_DATA_ADDRESS`, and `INDEXFLOW_DAO_ADDRESS` are used by admin tooling and sync scripts.
- Express server with Helmet, CORS, and Pino logging.
- REST endpoints required by the product specification:
  - `POST /api/data/submit`
  - `GET /api/data/:id`
  - `POST /api/verify/callback`
  - `GET /api/search`
  - `POST /api/stake`
  - `POST /api/unstake`
  - `GET /api/rewards`
  - `POST /api/rewards/claim`
  - `POST /api/challenge`
- Validator operations: `POST /api/validator/proof`, `POST /api/validator/proof/schedule`, `GET /api/validator/jobs`, `PATCH /api/validator/jobs/:jobId` (proxied to the FastAPI microservice with scheduling queue support).
- Global rate limiting is enabled and critical admin/validator routes emit structured audit logs via Pino.
- Validator callbacks now require ECDSA signatures (`x-validator-address`/`x-validator-signature` headers) before state transitions are accepted.
- PostgreSQL connection helper (`src/db/postgres.ts`) and ElasticSearch client wrapper (`src/services/searchService.ts`) are ready to be wired into real infrastructure. Until then, all endpoints respond with strongly typed mock data.
- Optional FastAPI validator integration can be configured via `DATA_VALIDATOR_URL`; dataset submissions will be validated when the service is available.
- Backend proxies attach `DATA_VALIDATOR_API_KEY` so the validator microservice can enforce authenticated access.


## Containerized Environment

For a full local stack (PostgreSQL, ElasticSearch, data validator, backend, frontend) run the Docker Compose toolkit in `ops/`. See [ops/README.md](ops/README.md) for instructions.

## Smart Contracts (`contracts/`)

```bash
cp contracts/.env.example contracts/.env
npm run build --prefix contracts
npm run test --prefix contracts
```

- `IndexFlowToken.sol`: ERC20 with dual-mode staking (passive and active), reward accrual, slashing, and adjustable APY.
- `IndexFlowData.sol`: Registry for dataset submissions, Proof of SQL hashes, challenge handling, and reward disbursement.
- `IndexFlowDAO.sol`: Governance controller that updates protocol parameters, registers validators, disburses rewards, and triggers slashing through the token contract.
- TypeScript tests (`test/indexflow.test.ts`) cover staking rewards and the dataset lifecycle.
- Deployment helper (`scripts/deploy.ts`) scaffolds token, data registry, and DAO instances for Sepolia and writes the latest addresses to `contracts/deployments/`.

### Syncing New Deployments

After running a Hardhat deployment, propagate fresh ABIs and addresses to the frontend/backend with:

```bash
npx hardhat run contracts/scripts/deploy.ts --network <network>
npm run sync:contracts
```

The sync script copies ABI artifacts into `frontend/src/lib/ABI` and updates `.env` files in both workspaces with the latest `IndexFlowToken`, `IndexFlowData`, and `IndexFlowDAO` addresses.

## Data Validator Microservice (`microservices/data-validator/`)

```bash
cd microservices/data-validator
uvicorn app.main:app --reload --port 7000
```

Endpoints:

- `GET /health` - readiness probe.
- `POST /validate` - accepts JSON records or CSV payload, infers schema, reports issues, and emits dataset/sql hashes.
- `POST /hash` - produces sha256 or keccak256 digests for arbitrary payloads.

This service is intended to run alongside the backend. The backend can POST dataset samples to `/validate` and persist returned hashes inside the IndexFlowData contract.

## Suggested Development Flow

1. Run `npm run dev --prefix backend` to serve REST endpoints on `http://localhost:4000`.
2. Launch the microservice to validate submissions: `uvicorn app.main:app --reload`.
3. Start the frontend: `npm run dev --prefix frontend`.
4. Optional: run Hardhat local node `npx hardhat node --network hardhat` inside `contracts/` to interact with staking contracts.

## Testing

```bash
# lint & type-check (root)
npm run lint
npm run typecheck

# backend unit tests (add your own with vitest/jest)
npm run test --prefix contracts   # smart contract suite

# python service tests can be added with pytest
```

## Data Flow Overview

1. **Submission**: Users upload JSON or CSV via the frontend. The payload is sent to the FastAPI validator, which returns dataset and SQL hashes.
2. **Storage**: The backend stores metadata in PostgreSQL and indexes rich descriptors in ElasticSearch.
3. **On-chain Proof**: Validator nodes call `recordProof` on `IndexFlowData` with the Proof of Indexing and Proof of SQL hashes.
4. **Rewards**: The DAO contract disburses IFLW rewards and, if necessary, slashes malicious validators through `IndexFlowToken`. Stakers can claim accrued rewards on-chain and the backend mirrors the claim in PostgreSQL.
5. **Search**: The frontend uses `GET /api/search` to perform semantic queries that translate to SQL templates and return curated datasets.

## Seed Data

- Frontend mock stats and tables live in `frontend/src/lib/mockData.ts`.
- Backend mock datasets, stakes, and challenges live in `backend/src/mock/mockData.ts`.
- These mocks power all dashboards end-to-end until live infrastructure is connected.

## License

This project is provided as-is for demonstration purposes. Adapt the code and licensing terms as needed for your production deployment.



