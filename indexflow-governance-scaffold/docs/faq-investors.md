# Investor FAQ

## Why DAO-lite instead of a pure DAO?

- Faster iteration while we validate product-market fit.
- Governance participants remain KYC'ed and accountable, reducing immediate regulatory complexity.
- DAO-lite contracts are intentionally non-custodial; real capital stays with the legal entity until safeguards are audited.

## When do we form the entity?

- Estonia OÜ or Wyoming LLC formation kicks off **post-term sheet**.
- Entity opens banking rails and signs contributor MSAs before any funds move.
- DAO-lite proposals stay off-chain until the entity authorizes the go-live.

## Risk controls before funding closes

- Dry-run contracts revert on value transfers and require off-chain signatures.
- Ops checklist (see `ops/notion_checklist.md`) blocks any real spend until compliance docs are uploaded.
- Incident response and audit slots are booked during the first quarter post-raise.

## How do we think about runway?

Runway is tracked monthly:

```
Runway (months) = Cash on hand / Monthly burn
Example: $2.4M cash / $160K burn = 15 months runway
```

We maintain a 4-month safety buffer and reforecast after every quarter.

## Additional talking points

- Validators receive off-chain stipends that can be paused within 24 hours.
- DAO-lite escalates to the entity directors for any item that impacts regulatory posture.
- Mainnet deployment waits on: audited contracts, real treasury infrastructure, and regulator-readiness review.
