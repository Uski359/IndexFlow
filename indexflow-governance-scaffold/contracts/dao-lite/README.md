# DAO-lite Contracts

These contracts scaffold the governance dry-run space for IndexFlow. They are intentionally incomplete and must **never** be deployed with live funds.

## Components

- `DAOExecutor.sol` — Timelock-style executor skeleton. Holds access-control and delay state but omits queue/execute logic for now.
- `DAOGovernor.sol` — Off-chain snapshot aware governor that aggregates votes provided by trusted operators.
- `TreasuryMock.sol` — Emits deposit/withdrawal events and reverts to guarantee no value transfer.
- `interfaces/` — Minimal ERC20 and executor interfaces for future integrations.

## Dry-run flow

1. Compile the contracts with `npm run compile:sol`.
2. Use `scripts/propose_and_vote.ts` to simulate a full proposal lifecycle locally.
3. Once comfortable, deploy to Sepolia via `scripts/deploy_testnet.ts` **after** populating `infra/.env.example` values in a real `.env`.

> TODO: integrate real queue/execute logic and audited treasury once the DAO-lite structure is funded and governed by the legal entity.
