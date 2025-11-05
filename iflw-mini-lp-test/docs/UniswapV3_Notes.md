# Uniswap V3 Quick Notes

## Ticks & Price Grid
- Prices map to integer ticks where `price = 1.0001^tick` (token1 per token0).
- Liquidity is provided in discrete tick ranges (`tickLower`, `tickUpper`), enabling concentrated liquidity.
- Tick spacing depends on fee tier (e.g. 60 for 0.3%); always snap ranges to multiples of that spacing.

## sqrtPriceX96 Encoding
- Core math uses Q64.96 fixed point: `sqrtPriceX96 = sqrt(price) * 2^96`.
- Helper `ratioToSqrtPriceX96` converts rational price targets and token decimals into the encoded value used by `pool.initialize`.
- `slot0` exposes the live `sqrtPriceX96` and `tick`; both change on swaps and liquidity updates.

## Fee Tiers
- Supported tiers: 0.01% (100), 0.05% (500), 0.3% (3000), 1% (10000).
- Higher fees mean larger tick spacing, which widens grids but captures more for volatile pairs.
- `.env` defaults to fee tier 0.3% (`FEE_TIER=3000`), a balanced choice for new asset discovery.

## Concentrated Liquidity Lifecycle
1. **Create Pool:** `02_create_pool.ts` seeds a new pool via the factory (NonfungiblePositionManager).
2. **Initialize:** `03_initialize_pool.ts` sets the starting `sqrtPriceX96` derived from `.env` price ratios.
3. **Mint Position:** `04_add_liquidity.ts` consumes JSON configs, computes ticks, approves tokens, and mints the NFT.
4. **Swaps & Quotes:** `05_get_quote.ts` (QuoterV2) and `06_swap.ts` (SwapRouter02) simulate trades and execute sample swaps.
5. **Lifecycle Ops:** `07_collect_fees.ts` harvests fees, and `08_remove_liquidity.ts` decreases or burns the position.

## Staking & Wrapper Overlay
- `IFLWStakingRewards.sol` introduces an IFLOWT/IFLWR staking module parallel to the LP position.
- `IFLWUnifiedWrapper.sol` mints a single ERC20 receipt token (**IFLOW** by default) while staking IFLOWT and accruing IFLWR rewards internally.
- `09_deploy_staking.ts` deploys the contract; `12_notify_rewards.ts` funds epochs; `10_stake.ts`, `11_claim_rewards.ts`, and `14_wrapper_actions.ts` manage user and wrapper flows.
- Staking rewards plus the wrapper encourage LPs to retain inventory while still monitoring Uniswap exposure through a simplified asset view.

## Tooling Tips
- Snapshot `.env` before running automation or redeploys.
- Regenerate TypeChain types after contract edits with `pnpm hardhat compile`.
- Track updates to JSON configs to document strategy shifts.
