# Validator Lifecycle

This MVP keeps the validator experience intentionally simple so we can focus on demonstrating proof-of-indexing. The full lifecycle looks like this:

1. **Register:**
   - A node operator calls `ValidatorRegistry.register()` from their validator wallet.
   - The registry stores the operator address, flips the validator to `active`, and seeds the `lastProof` timestamp.

2. **Stake:**
   - The validator deposits ETH via `StakingRewards.deposit()` (the NodeHeartbeat script does this automatically up to `MIN_STAKE`).
   - The staking contract marks the balance and calls `ValidatorRegistry.updateStake()` so discovery APIs can read the combined metadata from the registry contract.

3. **Submit proof:**
   - Every 5 seconds the validator (or `NodeHeartbeat.ts`) calls `StakingRewards.submitProof(bytes32 proofHash)` with a fresh keccak hash that represents the indexed data slice.
   - Proof hashes are tracked in the `proofHashUsed` mapping to prevent accidental replays during demos.

4. **Verify + reward:**
   - When `submitProof` hits the chain, `StakingRewards` verifies that the validator is active, has stake, and has not re-used a hash.
   - The contract updates the validator's `lastProof` timestamp inside the registry, calculates `reward = baseReward + uptimeMultiplier * (elapsed / PROOF_INTERVAL)`, and credits that reward back into the validator's stake (they can withdraw later).

5. **Deactivate:**
   - Validators can call `ValidatorRegistry.deactivate()` at any point. This freezes rewards but keeps historical data intact so explorers can show churn.

This flow is intentionally optimistic—future iterations would plug in proof verification against real indexer outputs, slash inactive nodes, and stream rewards from protocol revenue.

## Running the Demo Locally

1. Deploy the contracts in `packages/indexflow-validator-mvp` (see its README) to Hardhat or Sepolia.
2. Copy `env.sample` to `.env`, paste the deployed addresses, and set `VALIDATOR_KEY`, `VALIDATOR_NAME`, and `VALIDATOR_ENDPOINT`.
3. Run `pnpm run heartbeat --filter indexflow-validator-mvp` to register, stake, publish metadata, and start submitting proofs every few seconds.
4. Point `packages/indexflow-sdk-js` at the same addresses (`VALIDATOR_REGISTRY_ADDRESS`, `STAKING_REWARDS_ADDRESS`) so GraphQL queries return live `validatorActive`, `validatorStake`, and `pendingRewards` values.

With those pieces running, the end-to-end validator + rewards pipeline is visible from both the smart contracts (via Hardhat console) and the SDK-powered dashboards.
