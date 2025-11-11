# DAO-lite Architecture

## Diagram
```
Entity (Estonia OU shell) <-> DAO-lite Governor <-> Treasury (Timelocked) <-> Grants / Payments
```

- The `Entity` represents the future Estonia OU (Estonian private limited company) legal wrapper that can ratify governance decisions.
- `DAO-lite Governor` (DAOGovernor + DAOExecutor) tracks proposals, votes, and executes validated actions with a delay.
- `Treasury` is a mock contract that only logs deposits and withdrawals to keep all flows on testnets.
- `Grants` are downstream recipients (researchers, validators, vendors) referenced in proposals via metadata.

## Role Summary
- **Admin** – boots the system, updates roles/parameters, and can emergency-cancel proposals while the structure is experimental.
- **Proposer** – addresses that may create proposals and queue successful actions into the executor.
- **Validator** – Snapshot-style tally authority that submits final vote totals and is authorized to execute timelocked actions once the delay lapses.

## Flow Overview
1. Admin deploys the DAOExecutor, DAOGovernor, and TreasuryMock via Hardhat on a testnet (e.g., Sepolia).
2. Proposers craft calls (usually Treasury withdrawals) and publish the detailed vote off-chain on Snapshot/IPFS.
3. Validator submits the vote result to DAOGovernor, which transitions the proposal to `Succeeded` and allows queueing in DAOExecutor.
4. After the 2-hour delay, the validator (or admin) executes the queued transaction, which only emits logs on TreasuryMock to avoid moving real funds.

## Estonia OU Binding Plan
1. **Incorporation** – Once the Estonia OU is registered, make it the on-chain `admin` by rotating the DAOExecutor + DAOGovernor admin roles to the legal entity's multisig wallet.
2. **Governance Mirroring** – Create a corporate resolution template where the OU board ratifies each on-chain proposal hash. Store the signed resolution URI in the `snapshotURI` field for auditability.
3. **Banking Bridge** – When ready for real capital, deploy a production treasury contract controlled by the same DAOExecutor, but connect it to a licensed custodian or OU-controlled MPC wallet.
4. **Testnet-to-Mainnet Checklist** – Before moving beyond testnets, extend TreasuryMock with real transfers, add audited access-control/pausing, introduce on-chain voting weights, and complete an external security review.

*This stack is intentionally limited to test networks and mock value flows. Do not route mainnet assets through it until the Estonia OU structure, compliance, and audits are finalized.*
