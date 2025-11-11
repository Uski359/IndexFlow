# Deployment Playbook – Goerli & Sepolia

## Option A – Goerli Live Demo
Use Uniswap v3’s existing Goerli deployments to execute the full Mini LP flow end-to-end.

### Prerequisites
- Goerli RPC endpoint (`RPC_URL_GOERLI`) and funded wallet (`PRIVATE_KEY`).
- Update `.env`:
  ```ini
  RPC_URL_SEPOLIA=<leave blank or keep for later>
  RPC_URL_GOERLI=https://goerli.infura.io/v3/<key>
  UNIV3_FACTORY=0x1F98431c8aD98523631AE4a59f267346ea31F984
  UNIV3_POSITION_MANAGER=0xC36442b4a4522E871399CD717aBDD847Ab11FE88
  UNIV3_SWAP_ROUTER=0xE592427A0AEce92De3Edee1F18E0157C05861564
  UNIV3_QUOTER_V2=0x61fFE014bA17989E743c5F6cB21bF9697530B21e
  WETH=0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6
  USDC=0x07865c6e87b9f70255377e024ace6630c1eaa37f (optional)
  ```
- In `infra/hardhat.config.ts`, add Goerli network (already supported; set `RPC_URL_GOERLI` + `PRIVATE_KEY`).

### Execution Steps
1. `pnpm ts-node scripts/00_print_env.ts` → confirm Goerli env.
2. (Optional) Deploy test token `01_deploy_token.ts` and record `IFLW_TOKEN`.
3. `02_create_pool.ts` → outputs pool address.
4. `03_initialize_pool.ts` → sets sqrt price.
5. `04_add_liquidity.ts`, `05_get_quote.ts`, `06_swap.ts` for demo swaps.
6. Staking + wrapper (scripts 09–14) leverage the same Goerli addresses.
7. Record tx hashes & pool link (https://goerli.etherscan.io/).

### Narrative Points for Investors
- Demonstrate real positions, swaps, and fee collection.
- Show staking wrapper (IFLOW) balance growth.
- Emphasize ability to port to mainnet post audit.

## Option B – Sepolia Custom Deployment
Deploy Uniswap v3 core/periphery + SwapRouter to Sepolia for a fully isolated demo.

### Deployment Checklist
1. Clone Uniswap repos or use npm packages (`@uniswap/v3-core`, `@uniswap/v3-periphery`, `@uniswap/swap-router-contracts`).
2. Using Hardhat or Foundry, deploy:
   - `UniswapV3Factory`
   - `WETH9` (already available, but optional to redeploy)
   - `NonfungiblePositionManager` (with factory + WETH)
   - `SwapRouter02` (with factory + WETH)
   - `QuoterV2`
3. Update `.env` with new addresses.
4. Run migrations: create fee tiers, initialize tokens if needed.
5. Execute script flow (02–08, 09–14) on Sepolia.
6. Publish deployment report (`infra/deployments/sepolia.json`).

### Resource Estimate
- Deployment + verification: ~1 day engineer time.
- Script adjustments minimal (addresses already configurable via `.env`).
- Optional: add Hardhat tasks to automate deployment using provided ABIs.

### Benefits
- Full control over pool config; no reliance on legacy testnet.
- Mirrors future mainnet deploy more closely.
- Supports advanced scenarios (custom fee tiers, wrapper gating).

## Audit & Rollout Timeline
| Phase | Duration | Output |
| ----- | -------- | ------ |
| Goerli demo hardening | 1 week | Reproducible script + tx log |
| Custom Sepolia deploy (optional) | 2-3 days | Self-hosted Uniswap env |
| Audit preparation | 1 week | Scoped docs, invariants |
| External audit | 3-4 weeks | Report + fixes |
| Mainnet launch | 1 week | Verified contracts, updated README |

Keep this playbook in the repo (`docs/Deployment_Playbook.md`) and reference it during investor discussions.
