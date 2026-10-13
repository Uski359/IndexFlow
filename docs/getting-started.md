# IndexFlow Getting Started Guide

This guide walks new contributors through cloning the repository, installing dependencies, configuring environment files, and running the local development stack.

---

## 1. Prerequisites

Make sure the following tooling is available on your machine:

- **Node.js 18 or 20** and **npm 9+** (the monorepo uses npm workspaces)
- **Git** for source control
- **Python 3.10+** (only required when running the optional validator microservice)
- **PostgreSQL 14+** and **Elasticsearch 8+** (recommended for a full local stack)
- An **Ethereum RPC endpoint** (Sepolia or local Hardhat) if you plan to deploy or interact with the smart contracts

> Tip: Use a version manager such as `fnm`, `nvm`, or `asdf` to keep the Node.js toolchain in sync with the project.

---

## 2. Repository Setup

```bash
git clone https://github.com/<your-org>/IndexFlow.git
cd IndexFlow

# install workspace dependencies once from the monorepo root
npm install
```

The install step bootstraps each workspace (`frontend`, `index-node`, `contracts`) and wires up Husky pre-commit hooks.

To verify the install:

```bash
npm run lint
npm run typecheck
```

Both commands fan out to the individual workspaces.

---

## 3. Environment Configuration

Each workspace exposes a template file with the required variables. Copy the template, then adjust the values for your environment.

| Service         | Template Path                      | Target File                      | Key Variables                                                                 |
|-----------------|------------------------------------|----------------------------------|-------------------------------------------------------------------------------|
| Frontend        | `frontend/.env.example`            | `frontend/.env.local`            | `NEXT_PUBLIC_INDEX_NODE_URL`, `NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_STAKING_CONTRACT` |
| Index Node API  | `index-node/.env.example`          | `index-node/.env`                | `DATABASE_URL`, `RPC_URL`, `CHAIN_ID`, `START_BLOCK`, `INDEX_POLL_INTERVAL_MS`, `PORT` |
| Smart Contracts | `contracts/.env.example`           | `contracts/.env`                 | `DEPLOYER_KEY`, `SEPOLIA_RPC_URL`, `ETHERSCAN_API_KEY`                        |

Example copy commands (PowerShell):

```powershell
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item index-node/.env.example index-node/.env
Copy-Item contracts/.env.example contracts/.env
```

### Optional: Validator Microservice

If you plan to run the data validator service located at `microservices/data-validator`, create and activate a virtual environment and install the requirements:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r microservices/data-validator/requirements.txt
```

---

## 4. Running the Development Stack

Use separate terminals for each service so logs remain readable.

### 4.1 Index Node API (backend)

```powershell
npm run dev:index-node
```

This starts the TypeScript API on `http://localhost:4000`, connects to the configured `DATABASE_URL` and Ethereum RPC, and begins indexing from `START_BLOCK`.

### 4.2 Frontend (Next.js)

```powershell
npm run dev:frontend
```

The app is served on `http://localhost:3000`. It consumes the index node endpoint (`NEXT_PUBLIC_INDEX_NODE_URL`), connects to wallets via Wagmi, and surfaces staking dashboards and landing pages.

### 4.3 Smart Contracts / Hardhat

```powershell
npm run dev:contracts
```

Runs a local Hardhat node. Use `npm run build:contracts` or `npm run test --workspace contracts` for compilation and tests. Deployment scripts read from the `contracts/.env` file.

### 4.4 Validator Microservice (optional)

```powershell
uvicorn app.main:app --reload --port 7000 --app-dir microservices/data-validator
```

Point `index-node` to the microservice by adding `DATA_VALIDATOR_URL=http://localhost:7000` to `index-node/.env`.

---

## 5. Useful Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | Lints all workspaces. |
| `npm run typecheck` | Runs TypeScript type checking across contracts, index node, and frontend. |
| `npm run test --workspace contracts` | Executes the Hardhat test suite. |
| `npm run sync:contracts` | Copies freshly deployed contract ABIs/addresses into the consuming apps. |
| `npm run demo` | Spins up the Docker Compose demo stack (requires Docker Desktop). |

---

## 6. Next Steps

1. Deploy or point to an existing set of IndexFlow contracts, then update the environment variables in `frontend/.env.local` and `index-node/.env`.
2. Seed PostgreSQL/ElasticSearch with mock data or connect to live infrastructure.
3. Explore the domain-specific documentation in `README.md`, `contracts/README.md`, and `index-node/README.md` for feature-level details.

You are now ready to contribute to IndexFlow! If you encounter setup issues, double-check the environment variables and Node.js version first, then review service logs for more context.
