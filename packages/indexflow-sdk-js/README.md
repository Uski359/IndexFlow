## IndexFlow SDK + GraphQL Wrapper

Developer-focused toolkit that simulates verified data coming out of the IndexFlow protocol. It provides:

- A TypeScript SDK with helpers to fetch verified data, push proofs, and inspect stats.
- An Express + Apollo GraphQL server that exposes the `verifiedData` query on `http://localhost:4000/graphql`.
- Ethers v6 wiring towards the `ValidatorRegistry` and `StakingRewards` contracts so on-chain signals can be stitched in when addresses are configured.

### Prerequisites

- Node.js 20+
- `pnpm` (preferred for the monorepo)

### Install

From the monorepo root:

```bash
pnpm install
```

### Run the GraphQL server

```bash
pnpm --filter @indexflow/sdk dev
```

The server starts on `http://localhost:4000/graphql` and hot reloads using `tsx`.

### SDK Usage

```ts
import { getVerifiedData, submitProof, queryStats } from '@indexflow/sdk';

const proofs = await getVerifiedData('0xabc...', 'ATTESTATION');
await submitProof('0xdeadbeef...');
const stats = queryStats();
```

See [`docs/Developer_API.md`](./docs/Developer_API.md) for detailed GraphQL samples, CLI snippets, and environment variable references.
