# Docs Quick Start

1. **Install dependencies** using the commands in the root `README.md`.
2. **Review architecture** in `dao-lite-architecture.md` to understand roles across the Entity ↔ DAO-lite ↔ Treasury ↔ Grants pathway.
3. **Run dry-runs**:
   - `npm run dry-run:proposal` — generate an end-to-end proposal lifecycle with mock signatures.
   - `npm run dry-run:rewards` — compute validator reward projections from `scripts/validators.sample.json`.
   - `npm run dry-run:fund-flow` — print the ascii diagram for stakeholder briefings.
4. **Prepare deployment** by copying `infra/.env.example` to `.env`, editing RPC + keys, then executing `npm run compile:sol` followed by `ts-node scripts/deploy_testnet.ts`.
5. **Sync ops/legal** using the materials in `legal-templates/` and `ops/`.

> Keep all activity in sandbox mode until the entity directors approve moving to audited contracts and real fund flows.
