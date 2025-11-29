# IndexFlow Validator + Rewards MVP

This package contains the minimal on-chain plumbing for the validator lifecycle described in `docs/Validator_Lifecycle.md`. It ships two Solidity contracts plus helper scripts:

- `ValidatorRegistry.sol` – tracks validator status, stake, metadata, and proof timestamps.
- `StakingRewards.sol` – holds ETH stake, computes deterministic rewards per proof, and pays them back into the validator’s balance.
- `scripts/NodeHeartbeat.ts` – registers a validator, keeps stake above `MIN_STAKE`, sets metadata, and submits proofs at a fixed interval.

## 1. Install & Build

```bash
cd packages/indexflow-validator-mvp
pnpm install          # or npm install
pnpm hardhat compile
```

## 2. Configure Environment

Copy the sample file and populate it with a funded validator key plus the deployed contract addresses:

```bash
cp env.sample .env
```

Key variables:

| Var | Description |
| --- | --- |
| `RPC_URL` | JSON-RPC endpoint (Hardhat localhost, Anvil, Sepolia, etc.) |
| `VALIDATOR_KEY` | Private key for the validator wallet (never commit this). |
| `STAKING_REWARDS_ADDRESS` / `REGISTRY_ADDRESS` | Contract addresses from the deploy step. |
| `MIN_STAKE` | Target stake in ETH (script tops up to this amount). |
| `HEARTBEAT_INTERVAL_MS` | Interval between proof submissions. |
| `VALIDATOR_NAME` / `VALIDATOR_ENDPOINT` | Optional metadata published on-chain for explorers. |

## 3. Deploy Contracts

1. Start a local node (`pnpm hardhat node`) or set `RPC_URL` to Sepolia/another testnet.
2. Deploy the registry + staking contracts and wire them together:

   ```bash
   pnpm hardhat run --network sepolia scripts/deploy.ts
   # copy the printed addresses into .env
   ```

   > The deploy script defaults to Sepolia when `--network` is supplied; omit the flag to target localhost.

## 4. Run the Heartbeat

Once `.env` is populated:

```bash
pnpm ts-node scripts/NodeHeartbeat.ts
# or via package script:
pnpm run heartbeat
```

The script:
1. Registers the validator (if not already active).
2. Sets metadata when `VALIDATOR_NAME` / `VALIDATOR_ENDPOINT` are provided.
3. Tops up stake to `MIN_STAKE`.
4. Submits a fresh proof hash every `HEARTBEAT_INTERVAL_MS` milliseconds.

Each proof triggers `StakingRewards.submitProof`, which credits the reward back into the validator’s stake. The SDK (`packages/indexflow-sdk-js`) now reads `validatorMetadata`, `validatorStake`, and `previewReward` from these contracts, so GraphQL responses and UI widgets reflect real on-chain values when the addresses are configured.

## 5. Useful Commands

| Command | Description |
| --- | --- |
| `pnpm run node` | Launch Hardhat local devnet. |
| `pnpm run deploy` | Deploy registry + staking to the selected network. |
| `pnpm run heartbeat` | Start the validator loop using `.env` config. |
| `pnpm hardhat test` | Execute the contract unit tests (coming soon). |

## 6. Wiring Into the MVP

- Point `packages/indexflow-sdk-js` env vars (`VALIDATOR_REGISTRY_ADDRESS`, `STAKING_REWARDS_ADDRESS`) at your deployments so GraphQL queries include live validator status and pending rewards.
- The main docs (`docs/Validator_Lifecycle.md`, `docs/StakingRewards_Model.md`) reference this package for hands-on demos; keep contract addresses in sync when you redeploy.
