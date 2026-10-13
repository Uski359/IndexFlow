import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from "vitest";
import { prisma } from "@db/prisma";

const requestProofOfSqlMock = vi.fn(async () => ({
  id: "req-123",
  status: "QUEUED",
  etaSeconds: 180
}));

vi.mock("@proofs/sql", () => ({
  requestProofOfSql: requestProofOfSqlMock
}));

let resolvers: any;
let transferSpy: ReturnType<typeof vi.fn>;

const originalDelegates = {
  indexerCheckpointFindUnique: prisma.indexerCheckpoint.findUnique,
  blockFindFirst: prisma.block.findFirst,
  blockFindMany: prisma.block.findMany,
  indexedBatchFindMany: prisma.indexedBatch.findMany,
  indexedBatchFindUnique: prisma.indexedBatch.findUnique,
  transactionFindMany: prisma.transaction.findMany,
  erc20TransferFindMany: prisma.erc20Transfer.findMany,
  batchAttestationFindMany: prisma.batchAttestation.findMany
};

beforeAll(async () => {
  ({ resolvers } = await import("@graphql/schema"));
});

const checkpointMock = {
  chainId: "sepolia",
  lastIndexedBlock: 123,
  lastIndexedHash: "0xabc",
  safeBlockNumber: 120,
  updatedAt: new Date("2025-01-01T00:00:00Z")
};

const blockMock = {
  chainId: "sepolia",
  number: 123,
  hash: "0xblock",
  parentHash: "0xparent",
  timestamp: BigInt(1_700_000_000)
};

const batchMock = {
  chainId: "sepolia",
  id: "sepolia:1:10",
  startBlock: 1,
  endBlock: 10,
  poiMerkleRoot: "0xpoi",
  poiLeafCount: 4,
  safeBlockNumber: 100,
  totalBlocks: 10,
  totalTransactions: 25,
  totalTransfers: 12,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:05:00Z")
};

describe("GraphQL resolvers", () => {
  beforeEach(() => {
    requestProofOfSqlMock.mockClear();
    prisma.indexerCheckpoint.findUnique = vi
      .fn()
      .mockResolvedValue(checkpointMock as never) as typeof prisma.indexerCheckpoint.findUnique;
    prisma.block.findFirst = vi.fn().mockResolvedValue(blockMock as never) as typeof prisma.block.findFirst;
    prisma.block.findMany = vi.fn().mockResolvedValue([blockMock] as never) as typeof prisma.block.findMany;
    prisma.indexedBatch.findMany = vi
      .fn()
      .mockResolvedValue([batchMock] as never) as typeof prisma.indexedBatch.findMany;
    prisma.indexedBatch.findUnique = vi
      .fn()
      .mockResolvedValue(batchMock as never) as typeof prisma.indexedBatch.findUnique;
    prisma.transaction.findMany = vi
      .fn()
      .mockResolvedValue([] as never) as typeof prisma.transaction.findMany;
    transferSpy = vi.fn().mockResolvedValue([] as never);
    prisma.erc20Transfer.findMany = transferSpy as typeof prisma.erc20Transfer.findMany;
    prisma.batchAttestation.findMany = vi
      .fn()
      .mockResolvedValue([] as never) as typeof prisma.batchAttestation.findMany;
  });

  afterEach(() => {
    prisma.indexerCheckpoint.findUnique = originalDelegates.indexerCheckpointFindUnique;
    prisma.block.findFirst = originalDelegates.blockFindFirst;
    prisma.block.findMany = originalDelegates.blockFindMany;
    prisma.indexedBatch.findMany = originalDelegates.indexedBatchFindMany;
    prisma.indexedBatch.findUnique = originalDelegates.indexedBatchFindUnique;
    prisma.transaction.findMany = originalDelegates.transactionFindMany;
    prisma.erc20Transfer.findMany = originalDelegates.erc20TransferFindMany;
    prisma.batchAttestation.findMany = originalDelegates.batchAttestationFindMany;
    vi.restoreAllMocks();
  });

  it("returns health status", async () => {
    const result = await resolvers.Query.health();
    expect(result.lastIndexedBlock).toBe(123);
    expect(result.safeBlockNumber).toBe(120);
  });

  it("returns indexed batches", async () => {
    const result = await resolvers.Query.indexedBatches(null, { limit: 5 });
    expect(result).toHaveLength(1);
    expect(result[0].poiMerkleRoot).toBe("0xpoi");
  });

  it("provides proof of SQL placeholder", async () => {
    const response = await resolvers.Query.proofOfSql(null, { query: "SELECT 1" });
    expect(requestProofOfSqlMock).toHaveBeenCalledWith("SELECT 1");
    expect(response.status).toBe("QUEUED");
    expect(response.requestId).toBe("req-123");
  });

  it("fetches transfers with timestamps and pagination", async () => {
    const transferRows = [
      {
        chainId: "sepolia",
        id: "tx-1-0",
        txHash: "0xtx",
        logIndex: 0,
        blockNumber: 123,
        token: "0xtoken",
        from: "0xfrom",
        to: "0xto",
        value: "100",
        createdAt: new Date("2025-01-01T00:00:00Z"),
        block: {
          timestamp: BigInt(1_700_000_000)
        }
      }
    ];

    transferSpy.mockResolvedValueOnce(transferRows as never);

    const result = await resolvers.Query.transfers(null, {
      chainId: "sepolia",
      limit: 1,
      fromTimestamp: BigInt(1_699_999_999)
    });

    expect(transferSpy).toHaveBeenCalled();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].timestamp).toBe(BigInt(1_700_000_000));
    const decodedCursor = Buffer.from(result.nextCursor, "base64").toString("utf-8");
    expect(JSON.parse(decodedCursor)).toMatchObject({
      blockNumber: 123,
      txHash: "0xtx",
      logIndex: 0,
      id: "tx-1-0"
    });
  });
});
