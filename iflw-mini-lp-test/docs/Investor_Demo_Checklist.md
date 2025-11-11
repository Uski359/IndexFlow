# Investor Demo Checklist

Use this as the single source of truth when walking investors through the Sepolia mini-LP story. Update tx hashes and screenshots after each rehearsal so the rest of the team stays in sync.

## 1. Pre-demo sanity
- `.env` contains the current Sepolia addresses (see the table in the repo README).
- Wallet holds at least 0.3 Sepolia ETH for approvals, swaps, and burns.
- `pnpm install` has already completed.
- Run `pnpm hardhat compile` once so ABIs are cached locally.

## 2. Warm-up commands
1. `pnpm ts-node scripts/00_print_env.ts`  
   - Screenshot the contract table and call out the RPC URL.  
   - Emphasize that factory / router / quoter are our own deployments.
2. `pnpm ts-node scripts/05_get_quote.ts`  
   - Highlight the "0.5 WETH -> 920 IFLWT" line to show available depth on a private pool.

## 3. Core Uniswap workflow
| Step | Command | What to say / capture |
| --- | --- | --- |
| Create pool | `pnpm ts-node scripts/02_create_pool.ts` | Idempotent factory call; mention factory `0x1C67aDeC7EA9d4ef2B240746d8f2D4E81569Adc2`. |
| Initialize price | `pnpm ts-node scripts/03_initialize_pool.ts` | Screenshot tx hash plus the target `sqrtPriceX96`. |
| Add liquidity | `pnpm ts-node scripts/04_add_liquidity.ts` | Mention tick range, deposit sizes, resulting `tokenId` (currently `1`). |
| Swap | `pnpm ts-node scripts/06_swap.ts amount=0.1 direction=WETH_IFLW` | Capture expected output plus swap tx hash. |
| Collect fees | `pnpm ts-node scripts/07_collect_fees.ts tokenId=1` | Show the `Collect` event values. |
| Remove liquidity | `pnpm ts-node scripts/08_remove_liquidity.ts tokenId=1 percent=100` | Point out decrease / collect / burn sequence. |

## 4. Supporting narrative
- `scripts/shared/env.ts` performs strict address validation, so demos fail fast if `.env` is stale.
- `docs/Deployment_Playbook.md` explains the path from this Sepolia sandbox to the Goerli demo and audited mainnet rollout.
- If time allows, run `scripts/09+` to showcase the staking wrapper and reward flows (keep tx hashes handy).

## 5. After each rehearsal
- Update this file with new tx hashes or any deviations.
- Drop fresh screenshots (labelled with the step numbers above) into the shared deck.
- Record any RPC throttling or UX hiccups so we can pre-empt them before the live session.

_Last updated: 2025-11-11 - replace this line after your next dry run._
