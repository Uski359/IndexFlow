# DAO-lite Architecture

```
┌──────────────────┐      ┌────────────────┐      ┌────────────────┐      ┌────────────────────┐
│  Estonia OÜ /    │◄────►│   DAO-lite      │◄────►│  Treasury Mock  │◄────►│  Grants & Programs │
│  Wyoming LLC     │      │  (Governor +    │      │  (no real funds)│      │  (Validators, R&D) │
│  (off-chain)     │      │  Executor)      │      │                │      │                    │
└──────────────────┘      └────────────────┘      └────────────────┘      └────────────────────┘
```

## Components

- **Entity (Estonia OÜ / Wyoming LLC)** — Holds bank accounts, signs real-world contracts, and anchors legal responsibility.
- **DAO-lite** — Governor + timelock stack for structured decision making. Off-chain voting snapshot ensures small committee agility.
- **Treasury Mock** — Emits events for dry-run simulations. Real treasury will be inserted once funding closes.
- **Grants & Programs** — Execution layer: validator incentives, indexing R&D, community pilots.

## Control Flow

1. The entity validates compliance (KYC, tax) before green-lighting proposals.
2. DAO-lite records proposals, off-chain votes, and queued actions.
3. Executor emits queued events; eventual production version will relay to multisig / banking APIs.
4. Treasury mock highlights the intended transfers with zero value movement.
5. Program owners coordinate deliverables and track KPIs in ops tooling (Notion, dashboards).

> Keep everything off-chain until bank accounts + multisig wallets are ready. This scaffold is for governance rehearsal.
