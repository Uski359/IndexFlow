# Validator Rewards Model (Off-Chain)

## Overview

Validator incentives are simulated off-chain until the DAO-lite secures funding and the audited treasury is in place. The goal is to model rewards proportional to **stake commitment** and **uptime performance**.

## Inputs

- `stake` — Amount of capital (or hardware commitment proxy) declared by the validator.
- `uptime` — Percentage of expected online time achieved during the measurement window (0–1 range).
- `TOTAL_REWARD` — Budget for the reward cycle (default 10,000 units in the script).

All inputs live in `scripts/validators.sample.json` (override via `VALIDATORS_FILE` env var).

## Calculation

1. Compute the weight per validator: `weight_i = stake_i * uptime_i`.
2. Sum weights: `total_weight = Σ weight_i`.
3. Allocate rewards: `reward_i = (weight_i / total_weight) * TOTAL_REWARD`.

Rounding happens at two decimals for reporting. Adjust rounding policy when converting to fiat or stablecoins.

## Outputs

The script writes `ops/validator_rewards.csv` with columns:

```
validator_id,stake,uptime,reward
```

Use the CSV to inform grant agreements and validator invoices during the dry-run phase.

## Next Steps

- Link uptime metrics to actual monitoring dashboards.
- Introduce penalties for SLA breaches before mainnet.
- Add audit trails (signatures, timestamps) once the DAO-lite formalizes attestations.
