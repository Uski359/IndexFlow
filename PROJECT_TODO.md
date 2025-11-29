# IndexFlow – Project TODO & Roadmap

Priority convention:
- **P0 – Now / Blocker:** Required for core product or raising; do before new features.
- **P1 – Next:** Important, but can follow P0 items.
- **P2 – Later / Nice-to-have:** Long‑tail improvements and polish.

---

## 1. Core Stack (Monorepo)

- **P0:** Deploy or point all services to a consistent set of live IndexFlow contracts (testnet/mainnet) and update:
  - `frontend/.env.local`
  - `index-node/.env`
  - `contracts/.env`
- **P0:** Seed PostgreSQL and Elasticsearch with either mock or real data and verify end‑to‑end flows:
  - `npm run dev:index-node`
  - `npm run dev:frontend`
  - (optional) validator microservice
- **P0 (ongoing):** Treat `frontend/QA.md` as a release gate:
  - Run all smoke tests (health widget, search, submit, stake, curate, validator jobs, error handling) against the current environment.
  - Keep regression checklist commands green:
    - `npm run lint --prefix frontend`
    - `npm run typecheck --prefix frontend`
    - `npm run test --prefix backend`
    - `npm run test --prefix contracts`
- **P1:** Make `npm run demo` and `ops/docker-compose.yml` the “single command” demo path and keep them in sync with the latest infra.

---

## 2. Index Node & PoI / Staking Bridge

- **P0:** Finish the PoI → staking bridge:
  - Wire `indexflow-poc/src/verifier.ts` to actually submit on‑chain attestations / signatures for verified batches to the staking/rewards contracts.
  - Make sure this path is reflected in `index-node/README.md` and tested against a real testnet.
- **P0:** Ensure Prometheus metrics are exposed and monitored:
  - Finalize `GET /metrics` (e.g., `indexed_blocks_total`, `erc20_transfers_total`, error counters).
  - Add basic dashboards and alerts for indexing lag and failure conditions.
- **P1:** Improve GraphQL API ergonomics:
  - Extend `transfers` (and related queries) with:
    - Time‑range filters (from/to block or timestamp).
    - Cursor‑based pagination instead of offset‑based.
- **P1:** Harden multi‑chain support:
  - Verify `CHAIN_IDS` / `*_RPC_URL` / `*_START_BLOCK` flows across Sepolia, Base, Polygon.
  - Add sanity checks in logs and `/health` for each configured chain.
- **P2:** Expand AI query tooling:
  - Add more guarded examples / templates for `npm run ai:query` (IndexFlow‑specific questions).
  - Document chain‑aware query patterns (`chainId` filtering) with concrete recipes.

---

## 3. Mini LP Demo (iflw-mini-lp-test)

- **P0:** Make the Goerli or Sepolia demo path fully reproducible:
  - Complete the relevant checklist in `docs/Deployment_Playbook.md` (Goerli or Sepolia).
  - Keep `.env` addresses and `infra/deployments/*.json` in sync with the latest deployments.
- **P1:** Introduce automation around liquidity, staking, and wrapper scripts:
  - Cron/keeper or simple scheduled runner that:
    - Refreshes liquidity ranges.
    - Tops up staking rewards and wrapper reserves when thresholds are hit.
- **P1:** Add fork tests and integrate into CI:
  - Fork‑based tests for key scripts (pool init, add liquidity, swap, staking flows).
  - Ensure they run in GitHub Actions along with the existing unit tests.
- **P2:** Build monitoring around economic parameters:
  - Track `.env` price ratios vs on‑chain TWAP.
  - Monitor staking balances, wrapper share supply, and reward reserves.
  - Define thresholds and actions (rebalance, top‑up, pause demo).

---

## 4. Governance, DAO-lite & Legal

- **P0:** Complete critical items in `indexflow-governance-scaffold/ops/notion_checklist.md` before handling real funds:
  - Form Estonia OÜ or Wyoming LLC and open banking/fintech rails.
  - Upload KYC/KYB docs to secure vault.
  - Configure accounting stack (ledger, payroll, tax).
  - Book security audit slot and define incident response rotation.
  - Validate run‑rate/runway calculations with finance lead.
- **P0:** Harden DAO-lite contracts before any mainnet or value‑bearing use:
  - Implement real queue/execute logic in `DAOExecutor.sol`.
  - Replace `TreasuryMock` with an audited, pausable treasury that can safely move funds.
  - Add test coverage for timelock, cancellation, and pause flows.
- **P1:** Execute the “Testnet‑to‑Mainnet Checklist” from `indexflow-dao-lite/docs/dao-lite-architecture.md`:
  - Extend treasury with real transfers.
  - Introduce on‑chain voting weights.
  - Complete an external security review.
- **P1:** Finalize legal templates in `indexflow-governance-scaffold/legal-templates`:
  - `grant-msa.md`: add signature blocks, insurance requirements, and dispute resolution.
  - `execution-agreement-ou.md`: add governing law, dispute resolution, and signatures.
  - `execution-agreement-llc.md`: add indemnity, governing law (Wyoming), and signature section.
- **P2:** Align off‑chain and on‑chain governance:
  - Implement a process to mirror DAO-lite proposals into corporate resolutions (Estonia OÜ or LLC).
  - Store resolution references (e.g., URIs) in on‑chain metadata for auditability.

---

## 5. Validator Incentives & Monitoring

- **P1:** Link validator rewards to real monitoring:
  - Connect uptime metrics in `validator-rewards-model` to actual observability dashboards.
  - Use those metrics as the source of truth for reward calculations.
- **P1:** Introduce penalties for SLA breaches ahead of mainnet:
  - Define clear SLA thresholds (availability, response times, data freshness).
  - Apply negative adjustments or slashing in the off‑chain model.
- **P2:** Add audit trails for rewards:
  - Include signatures, timestamps, and input snapshots for each reward cycle.
  - Prepare data structures that can be ported into on‑chain claims later.

---

## 6. QA, Demos & Communication

- **P0 (ongoing):** Use `frontend/QA.md` as a pre‑release checklist for every frontend change.
- **P0 (ongoing):** Keep `iflw-mini-lp-test/docs/Investor_Demo_Checklist.md` current:
  - Update tx hashes and screenshots after each dry run.
  - Record any RPC throttling or UX issues so they can be mitigated before investor demos.
- **P1:** Keep investor‑facing docs in sync with reality:
  - `docs/Deployment_Playbook.md`
  - `iflw-mini-lp-test/docs/Liquidity_Strategy.md`
  - `indexflow-governance-scaffold/docs/faq-investors.md`
- **P2:** Add an internal “runbook index” (optional):
  - Short index of all runbooks and checklists (setup, demo, incident, governance) with links back to the source files.

