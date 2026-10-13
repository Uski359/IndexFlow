# IndexFlow API Reference

Developers interact with IndexFlow through a lightweight REST surface and a GraphQL endpoint served by the index-node service. The default local base URL is:

```
http://localhost:4000
```

> The port is configurable via `PORT` in `index-node/.env`. All endpoints are available over HTTP or HTTPS depending on your deployment.

## Quick Facts

- **Rate limiting:** 120 requests per 10 seconds per IP (HTTP 429 on exceed)
- **Authentication:** none (protect upstream ingress as required)
- **Content types:** `application/json` for both REST and GraphQL requests

---

## REST Endpoints

### GET `/health`

Returns the indexer checkpoint and most recent batch statistics to signal overall health.

```bash
curl -X GET http://localhost:4000/health
```

**Response 200**

```json
{
  "status": "healthy",
  "chainId": "sepolia",
  "checkpoint": {
    "chainId": "sepolia",
    "lastIndexedBlock": 5678123,
    "safeBlockNumber": 5678115,
    "lastIndexedHash": "0xabc...def",
    "updatedAt": "2025-11-03T17:05:29.521Z"
  },
  "latestBatch": {
    "id": "batch-5678000-5678100",
    "endBlock": 5678100,
    "totalTransactions": 14892
  }
}
```

**Response 500**

```json
{ "status": "degraded" }
```

---

### POST `/proof/sql`

Queues an off-chain Proof of SQL request. The GraphQL API exposes the same functionality through `proofOfSql`.

```bash
curl -X POST http://localhost:4000/proof/sql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT attestor, merkle_root FROM attestations WHERE batch_id = $1",
    "requester": "validator-007"
  }'
```

**Request body**

| Field      | Type     | Required | Description                                   |
|------------|----------|----------|-----------------------------------------------|
| `query`    | string   | ✅       | SQL statement to prove                        |
| `requester`| string   | ❌       | Optional identifier logged with the request   |

**Response 202**

```json
{
  "requestId": "req_01HB4N0GH0XAD8EA9G1Q2TQG5E",
  "status": "queued",
  "etaSeconds": 45,
  "message": "Proof of SQL request accepted (placeholder)"
}
```

**Response 400**

```json
{ "error": "Missing SQL query in body" }
```

---

## GraphQL Endpoint

### POST `/graphql`

All reads are exposed through GraphQL queries. Use the `health` resolver for a GraphQL-native status check, or page through richer datasets such as blocks, transfers, indexed batches, and proofs.

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { health { lastIndexedBlock safeBlockNumber lastIndexedHash updatedAt } }"}'
```

#### Available Queries

| Query                   | Description                                           |
|-------------------------|-------------------------------------------------------|
| `health`                | Current checkpoint (equivalent to REST `/health`)     |
| `latestBlock`           | Most recent indexed block with nested transactions    |
| `blocks`                | Paginated block history                               |
| `indexedBatches`        | Latest finalized batches and attestations             |
| `proofOfIndexing`       | Deterministic proof for a batch ID                    |
| `proofOfSql`            | Asynchronous Proof-of-SQL request (mirrors REST)      |

#### Example: GraphQL Health Query

```graphql
query Health {
  health {
    lastIndexedBlock
    safeBlockNumber
    lastIndexedHash
    updatedAt
  }
}
```

**Sample Response**

```json
{
  "data": {
    "health": {
      "lastIndexedBlock": 5678123,
      "safeBlockNumber": 5678115,
      "lastIndexedHash": "0xabc...def",
      "updatedAt": "2025-11-03T17:05:29.521Z"
    }
  }
}
```

---

#### Example: Fetch Latest Block Snapshot

```graphql
query LatestBlock {
  latestBlock {
    number
    hash
    timestamp
    parentHash
    transactions(limit: 5) {
      items {
        hash
        from
        to
        value
      }
      nextCursor
    }
    transfers(limit: 5) {
      items {
        id
        token
        from
        to
        value
      }
      nextCursor
    }
  }
}
```

Use the returned `nextCursor` to page through additional transactions or transfers by passing it back to the nested connection.

---

#### Example: Historical Block Paging

```graphql
query Blocks($limit: Int!, $cursor: Int) {
  blocks(limit: $limit, cursor: $cursor) {
    items {
      number
      hash
      timestamp
    }
    nextCursor
  }
}
```

**Variables**

```json
{ "limit": 3, "cursor": 5678000 }
```

`nextCursor` returns the numeric block number to use for the subsequent request (acts as an exclusive upper bound).

---

#### Example: Indexed Batches & Attestations

```graphql
query IndexedBatches($limit: Int) {
  indexedBatches(limit: $limit) {
    id
    startBlock
    endBlock
    poiMerkleRoot
    totalBlocks
    totalTransactions
    createdAt
    attestations {
      attestor
      merkleRoot
      status
      createdAt
    }
  }
}
```

---

#### Example: Proof of Indexing Lookup

```graphql
query ProofOfIndexing($batchId: String!) {
  proofOfIndexing(batchId: $batchId) {
    batchId
    poiMerkleRoot
    poiLeafCount
    safeBlockNumber
    totalTransfers
    totalTransactions
    computedAt
  }
}
```

**Variables**

```json
{ "batchId": "batch-5678000-5678100" }
```

If the batch is unknown, the resolver returns `null`.

---

#### Example: Proof of SQL via GraphQL

```graphql
query ProofOfSql($sql: String!) {
  proofOfSql(query: $sql) {
    requestId
    status
    message
    etaSeconds
  }
}
```

**Variables**

```json
{
  "sql": "SELECT attestor, merkle_root FROM attestations WHERE batch_id = 'batch-5678000-5678100';"
}
```

Use the `requestId` to correlate with downstream processing in your validator workflows.

---

## cURL Cheat Sheet

```bash
# REST health
curl http://localhost:4000/health

# REST Proof of SQL
curl -X POST http://localhost:4000/proof/sql \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT * FROM attestations LIMIT 10"}'

# GraphQL Latest Block
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { latestBlock { number hash } }"}'
```

---

## Postman Collection

A ready-to-import Postman v2.1 collection covering `/health`, `/proof/sql`, and `/graphql` is available at:

```
docs/indexflow-docs/indexflow-postman.json
```

Import the file and set the `baseUrl` collection variable (defaults to `http://localhost:4000`).

---

## Local Development Tips

1. Start the index node: `npm run dev:index-node` (from project root).
2. Ensure PostgreSQL is reachable at the configured `DATABASE_URL`.
3. Optionally seed the database or run against the bundled mocks — the GraphQL API returns empty arrays until the indexer processes blocks.
4. Respect the built-in rate limits when scripting high-frequency operations.

Happy building!
