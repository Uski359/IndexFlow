# IFLW Mini LP Test (Uniswap V3 / Sepolia)

This repo packages the reproducible demo we use to explain IndexFlow's "mini LP" strategy: deploy lightweight Uniswap V3 infrastructure on Sepolia, mint the IFLOW test token, add concentrated liquidity against WETH, run a swap, collect fees, and fully unwind. Every step lives under `scripts/` so we can screenshot exact commands and tx hashes for investors.

## What's inside
- **Configurable Uniswap environment** - `.env` wires Sepolia RPC plus our custom factory, router, quoter, position manager, and token addresses.
- **Typescript helpers** - scripts `00`-`08` cover env verification, pool lifecycle, swaps, fee collection, and liquidity removal.
- **Deployment recipes** - `docs/Deployment_Playbook.md` breaks down Goerli (hosted infra) versus Sepolia (self-hosted `UniswapV3Factory`, `SwapRouter02`, `QuoterV2`).
- **Investor runbook** - `docs/Investor_Demo_Checklist.md` lists the talking points and screenshots to capture after each command.

## Current Sepolia deployment
| Contract / Asset | Address | Notes |
| --- | --- | --- |
| Factory | `0x1C67aDeC7EA9d4ef2B240746d8f2D4E81569Adc2` | Custom Uniswap V3 factory we deployed. |
| Position Manager | `0x99BB9ec86a89Bd3AE2D8cB12A4eAb4Aff2d85F4e` | NonfungiblePositionManager wired to this factory + WETH. |
| Swap Router 02 | `0xC3ba49ee04cF58CD206Fac3C212a3F54d4253865` | Latest deployment; scripts point here by default. |
| Quoter V2 | `0x0788CA98EAE832D37D832175ef95117C079c2F92` | Powers `05_get_quote.ts`. |
| WETH9 | `0xdd13E55209Fd76AfE204dBda4007C227904f0a81` | Canonical Sepolia WETH. |
| IFLWT (ERC20) | `0x93b95F6956330f4a56E7A94457A7E597a7340E61` | Test token with 18 decimals. |
| Reward token | `0x93b95F6956330f4a56E7A94457A7E597a7340E61` | Used by the staking wrapper demo. |
| Staking rewards | `0x015c2d9bDeb027Fe9c0FC1D3206Ad4ee97359F79` | Pull-based reward distributor. |
| Pool (IFLWT/WETH, 0.3%) | `0x3EbF117577D12f2c792D0De51d2DdFD277C75A7b` | Initialized at price ratio 1 : 20,000 (token1/token0). |
| Latest LP tokenId | `1` | Minted via `04_add_liquidity.ts`, reused in fee/withdraw scripts. |

## Demo flow (quick reference)
1. **Sanity check** - `pnpm ts-node scripts/00_print_env.ts` prints the active RPC plus all contract addresses.
2. **Pool lifecycle**
   - Create (idempotent): `pnpm ts-node scripts/02_create_pool.ts`
   - Initialize price: `pnpm ts-node scripts/03_initialize_pool.ts`
   - Seed liquidity: `pnpm ts-node scripts/04_add_liquidity.ts` (defaults to 1k IFLWT vs 0.05 WETH, tight range).
3. **Quote & swap**
   - Quotes: `pnpm ts-node scripts/05_get_quote.ts` shows how 0.01 / 0.1 / 0.5 WETH map to IFLWT via Quoter V2.
   - Swap: `pnpm ts-node scripts/06_swap.ts amount=0.1 direction=WETH_IFLW` mints approval if needed and submits `exactInputSingle`.
4. **LP follow-up**
   - Collect fees: `pnpm ts-node scripts/07_collect_fees.ts tokenId=1`.
   - Remove liquidity: `pnpm ts-node scripts/08_remove_liquidity.ts tokenId=1 percent=100`.
5. **Wrapper / staking** - scripts `09+` extend the story with the dual-token wrapper and staking rewards.

Each command echoes the tx hash and block number; paste those into your deck or share the etherscan URLs. Prefer a guided helper? Run `scripts/demo.sh` to chain compile, tests, env check, and then follow the printed manual steps.

## Docs & references
- `docs/Deployment_Playbook.md` - Goerli vs Sepolia deployment options and the rollout timeline.
- `docs/Investor_Demo_Checklist.md` - screenshot checklist plus narrative prompts for the pitch.
- `infra/hardhat.config.ts` - lists the supported networks; `.env` selects the RPC/key at runtime.

Questions or updates? Drop new tx hashes or notes in `docs/Investor_Demo_Checklist.md` after each dry run so the rest of the team can reuse the latest state.
