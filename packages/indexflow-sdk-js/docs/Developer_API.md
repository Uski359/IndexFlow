## IndexFlow Developer API

The IndexFlow SDK exposes high-level helpers and a GraphQL endpoint so integrators can simulate verified data flows without running the full protocol stack.

### GraphQL Endpoint

- **URL**: `http://localhost:4000/graphql`
- **Schema excerpt**:

```graphql
type ProofOnChain {
  validatorActive: Boolean!
  validatorStake: String!
  pendingRewards: String!
}

type ProofData {
  id: ID!
  address: String!
  eventType: String!
  txHash: String!
  blockNumber: Int!
  validator: String!
  timestamp: String!
  status: String!
  confidence: Float!
  payloadHash: String!
  metadata: ProofMetadata!
  onChain: ProofOnChain
}

type Query {
  verifiedData(address: String, eventType: String): [ProofData!]!
}
```

#### Example Query

```graphql
query VerifiedData($address: String!, $eventType: String) {
  verifiedData(address: $address, eventType: $eventType) {
    id
    eventType
    status
    validator
    metadata {
      dataset
      merkleRoot
    }
    onChain {
      validatorActive
      pendingRewards
    }
  }
}
```

```json
{
  "address": "0x1208a27682e247EFeFc0CC85E83d94ad0c5f61dD",
  "eventType": "ATTESTATION"
}
```

You can run the query with `curl`:

```bash
curl http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query($address:String!,$eventType:String){verifiedData(address:$address,eventType:$eventType){id eventType status validator onChain{validatorActive pendingRewards}}}",
    "variables": {
      "address": "0x1208a27682e247EFeFc0CC85E83d94ad0c5f61dD",
      "eventType": "ATTESTATION"
    }
  }'
```

### SDK Usage

Install dependencies from the monorepo root (`pnpm install`), then import the functions wherever you need them:

```ts
import { getVerifiedData, submitProof, queryStats } from '@indexflow/sdk';

const proofs = await getVerifiedData(
  '0x1208a27682e247EFeFc0CC85E83d94ad0c5f61dD',
  'ATTESTATION'
);

const pending = await submitProof('0xabc123...');
const stats = queryStats();
```

### Environment Variables

| Name | Description | Default |
| --- | --- | --- |
| `RPC_URL` | EVM endpoint used by ethers v6 | `https://ethereum.publicnode.com` |
| `VALIDATOR_REGISTRY_ADDRESS` | ValidatorRegistry contract used for activation + stake reads | not set (disables on-chain reads) |
| `STAKING_REWARDS_ADDRESS` | StakingRewards contract used for per-account pending rewards | not set (disables on-chain reads) |
| `PORT` | Express + Apollo server port | `4000` |

Leaving the contract addresses unset keeps the simulation fully offline while still exercising the ethers-based wiring for future deployments.
