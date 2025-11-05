# IFLW Mini LP Test (Uniswap V3 / Sepolia)

This mini project scaffolds a full concentrated-liquidity workflow for the IndexFlow tokens on Uniswap V3 (Sepolia). It covers pool lifecycle automation, IFLOWT/IFLWR staking rewards, and a unified wrapper that presents a single receipt token to users while handling both assets under the hood.

## Requirements
- Node.js 20+
- pnpm >= 8 (npm also works; replace commands as needed)
- Funded Sepolia account and basic TypeScript familiarity

## Installation
```bash
pnpm install
pnpm hardhat compile
```

## Environment Setup
```bash
cp infra/.env.example .env
```
1. Populate `.env` with Sepolia RPC, your deployer `PRIVATE_KEY`, and official Uniswap V3 contract addresses for Sepolia.
2. After deploying contracts, set token/staking entries: `IFLW_TOKEN`, `STAKING_TOKEN` (IFLOWT), `REWARD_TOKEN` (IFLWR), `STAKING_REWARDS`, and `UNIFIED_WRAPPER` once the wrapper is live.
3. Source canonical WETH / USDC addresses from Uniswap documentation (for example https://docs.uniswap.org/contracts/v3/reference/deployments) and verify before use.
4. Default price ratio is controlled by `P0_NUMERATOR` and `P0_DENOMINATOR`; by default 1 IFLW ~= 0.00005 WETH.
5. Leave `USDC` blank until you decide to add the IFLW/USDC pool.

> NOTE: Testnet only. Never point these scripts at mainnet with real funds.

## Script Flow
Run each script with `pnpm ts-node` from the project root.
```bash
pnpm ts-node scripts/00_print_env.ts
pnpm ts-node scripts/01_deploy_token.ts              # optional if you already have an IFLW token
# update .env with IFLW_TOKEN (and STAKING_TOKEN / REWARD_TOKEN where applicable)
pnpm ts-node scripts/02_create_pool.ts
pnpm ts-node scripts/03_initialize_pool.ts
pnpm ts-node scripts/04_add_liquidity.ts
pnpm ts-node scripts/05_get_quote.ts
pnpm ts-node scripts/06_swap.ts
pnpm ts-node scripts/07_collect_fees.ts tokenId=<id>
pnpm ts-node scripts/08_remove_liquidity.ts tokenId=<id> percent=100
# staking lifecycle
pnpm ts-node scripts/09_deploy_staking.ts [duration=604800]
pnpm ts-node scripts/10_stake.ts amount=100 mode=stake|withdraw|exit
pnpm ts-node scripts/11_claim_rewards.ts
pnpm ts-node scripts/12_notify_rewards.ts amount=1000
# unified wrapper
pnpm ts-node scripts/13_deploy_wrapper.ts name="IndexFlow Unified" symbol=IFLUX
pnpm ts-node scripts/14_wrapper_actions.ts action=deposit amount=100
```
Key notes:
- `02_create_pool.ts` orders tokens automatically; pass `quote=USDC` after configuring the stablecoin address.
- `04_add_liquidity.ts` reads `config/ranges.example.json` and snaps ticks using the fee tier spacing.
- `05_get_quote.ts` falls back to WETH notionals when USDC is absent and prints the assumption explicitly.
- `06_swap.ts` defaults to a 0.01 WETH swap; override with `amount=` and `direction=IFLW_WETH` to reverse flow.
- Staking scripts assume IFLOWT is the staking token and IFLWR is the reward token; ensure `.env` exposes their addresses first.
- Wrapper scripts issue a single receipt token (IFLUX by default) on deposit while staking IFLOWT and accruing IFLWR rewards internally.

## Dual-Token Staking & Wrapper
- `contracts/IFLWStakingRewards.sol` implements a Synthetix-style reward stream with configurable duration, manual funding (`notifyRewardAmount`), and user flows for stake / withdraw / exit.
- `contracts/IFLWUnifiedWrapper.sol` wraps IFLOWT staking into a unified ERC20 so users interact with a single asset while rewards accrue in IFLWR behind the scenes.
- `scripts/14_wrapper_actions.ts` handles deposits, withdrawals, claims, exits, and status reads for the wrapper token; pending rewards are reported in IFLWR units.

## Documentation
- `docs/Liquidity_Strategy.md` discusses objectives, range design, TVL stages, KPI targets, and now highlights the IFLOWT/IFLWR dual-token + wrapper overlay.
- `docs/UniswapV3_Notes.md` refreshes core Uniswap V3 concepts and includes reminders for staking automation and the unified wrapper.

## Testing
```bash
pnpm test
```
Unit tests cover Uniswap math helpers (`test/lpFlow.test.ts`), staking reward accrual (`test/stakingRewards.test.ts`), and unified wrapper flows (`test/unifiedWrapper.test.ts`). Extend with fork-based or integration tests as needed.

## Next Steps
- Introduce cron or keeper automation around liquidity, staking, and wrapper scripts.
- Add fork tests once Sepolia RPC infrastructure is wired into CI.
- Monitor `.env` price ratios versus on-chain TWAP, staking balances, wrapper share supply, and reward reserves to trigger rebalances or top-ups.
