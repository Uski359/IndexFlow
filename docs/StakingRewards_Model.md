# Staking Rewards Model

The MVP implements a deterministic reward function that keeps the economics easy to reason about during demos while leaving plenty of room for iteration.

## Parameters

- `baseReward`: flat amount of ETH (default `0.01`) a validator earns for every accepted proof.
- `uptimeMultiplier`: variable bonus paid per proof interval second (default `0.001`).
- `PROOF_INTERVAL`: constant window (5 minutes) used to normalize the uptime multiplier.
- `stakes[address]`: tracked per-validator balance that grows with rewards and shrinks when operators withdraw.
- `proofHashUsed[bytes32]`: replay guard that ensures we only mint rewards for unique proof payloads.

## Formula

```
reward = baseReward + (elapsedSeconds * uptimeMultiplier) / PROOF_INTERVAL
```

Where `elapsedSeconds = block.timestamp - lastProof`. Validators that keep up with heartbeats will hover near `baseReward`, while those who occasionally miss a proof will accumulate a larger bonus the next time they submit.

Rewards are credited back into the validator's stake so they compound automatically. When the contract holds enough ETH (funded via `receive()` or `fundRewardPool()`), validators can withdraw their earnings through `withdraw(amount)`.

This structure keeps the on-chain logic transparent:

1. Validators must be registered and staked before submitting proofs.
2. Proof submissions update the registry metadata and immediately credit rewards.
3. Withdrawing or deactivating simply updates the same registry entry so downstream components always have a consistent view of the network.
