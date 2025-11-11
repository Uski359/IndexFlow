# Mini LP Strategy - Uniswap V3 / Sepolia

## Objectives
- Establish an orderly secondary market for IFLW on Sepolia using Uniswap V3 concentrated liquidity.
- Target tight spreads around the target oracle price derived from `.env` (`P0_NUMERATOR=1`, `P0_DENOMINATOR=20000` -> 1 IFLW ~= 0.00005 WETH).
- Support low-slippage trades up to ~50k USD-equivalent while validating downstream analytics and alerting.

## Range Design
- **Primary range:** +/-30% around the target price (see `config/ranges.example.json`, `lower=0.7`, `upper=1.3`).
- **Buffer range:** +/-60% to keep a safety band once live market data thins out.
- **Fee tier:** `FEE_TIER=3000` (0.3%) balances depth vs. fee capture.
- **Tick spacing:** 60 (derived from the fee tier) keeps the main band within roughly +/-300 ticks at launch.
- **Inventory split:** 70% of deployable WETH in the primary band, 30% in the buffer to absorb volatility.

## TVL Staging Plan
| Phase | Window | Liquidity Action | Notes |
| --- | --- | --- | --- |
| TGE (Day 0) | After token generation | Seed 25% of target TVL in main band | Execute via `04_add_liquidity.ts` with `ranges.example.json`.
| Day 1-7 | Early adoption | Ramp to 50% TVL, top up buffer +/-60% | Monitor swap skew and oracle deviation.
| Week 2 | Growth & integrations | Scale to 75% TVL, add automation hooks | Introduce monitoring for arbitrage spreads.
| Weeks 3-4 | Maturity | Reach 100% of planned TVL, activate buffer | Evaluate shifting the primary range based on realized volatility.

## Rebalance Policy
- **Cadence:** Twice per week (Mon/Thu) or when on-chain TWAP deviates by >20% from the `.env` target price.
- **Method:**
  1. Run `05_get_quote.ts` to inspect slippage at 1k/10k/50k notionals.
  2. If skewed, use `07_collect_fees.ts` on active token IDs to harvest fees.
  3. Run `08_remove_liquidity.ts percent=100` on misaligned ranges, then reapply liquidity with an updated JSON config.
- **Contingency:** When USDC liquidity is available, mirror the same process for an IFLW/USDC pool.

## Dual-Token Staking Overlay
- **Staking asset:** IFLOWT (configured through `STAKING_TOKEN`).
- **Reward asset:** IFLWR (configured through `REWARD_TOKEN`).
- **Wrapper option:** `IFLWUnifiedWrapper` exposes a single receipt token (default symbol `IFLOW`) so front-end users interact with one asset while IFLOWT staking and IFLWR rewards run behind the scenes.
- **Staging:** Align staking reward epochs with the TVL plan above; fund rewards via `12_notify_rewards.ts` after each liquidity expansion.
- **Objective:** Encourage LPs and community members to stake IFLOWT while still earning delta-neutral fees from the Uniswap position.

## KPI Dashboard
| Metric | Target | Data Source |
| --- | --- | --- |
| Slip@10k USD | <= 0.60% | `05_get_quote.ts` results + Dune dashboards |
| Volume / TVL | >= 0.35x weekly | Uniswap Sepolia subgraph |
| Arbitrage Spread | <= 0.75% vs. Sepolia TWAP | Internal price monitor |
| Top-3 LP Share | <= 70% of TVL | Uniswap position analytics |
| Fee APR | >= 12% annualized | Position PnL tracker |
| Staking Participation | >= 60% of circulating IFLOWT | Staking contract events |
| Wrapper Adoption | >= 50% of stakers by Week 4 | Wrapper share supply vs. staking balances |

## Risk Controls
- **TWAP Anchoring:** Reference a 30-minute TWAP before rebalances; abort if deviation exceeds 40% without governance approval.
- **Staged Adds:** Never deploy more than 25% of dry powder in a single transaction; split adds across multiple runs of `04_add_liquidity.ts`.
- **Dual-Pair Option:** Keep USDC configuration ready to rotate into a stablecoin pair if WETH volatility spikes.
- **Automation Guardrails:** Require human approval for `07_collect_fees.ts` and `08_remove_liquidity.ts` when touching more than half of aggregate liquidity.
- **On-Chain Alerts:** Monitor pool price vs. `.env` target, reward contract balances, swap router gas spikes, wrapper share supply, and failed staking claims.

## Deployment & Audit Roadmap
- **Sepolia / Goerli Test Deployment:** Stand up core + periphery + wrapper on a supported testnet (Goerli today, Sepolia once official contracts exist). Record addresses in `infra/deployments/` and mirror to `.env`.
- **Staging Environment:** Run the full script flow using the wrapper token (IFLOW) and staking contract with forked-mainnet simulation to capture gas profiles and liquidity sensitivity.
- **Security Review:** Engage an external auditor to review `IFLWStakingRewards` and `IFLWUnifiedWrapper`. Scope includes allowance management, reward accounting, emergency controls, and wrapper exit paths. Target timeline: audit kickoff after staging tests; 3–4 weeks including remediation.
- **Mainnet Rollout:** Following audit sign-off, deploy contracts with verified bytecode, update docs/README, and provide investors with an execution checklist (env config, funding needs, monitoring dashboards).
- **Post-Launch Monitoring:** Implement alerting around TWAP deviations, wrapper share supply, keeper errors, and reward funding runway before enabling public LP participation.
