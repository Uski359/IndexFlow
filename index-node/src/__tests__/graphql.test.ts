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
    vi.spyOn(prisma.indexerCheckpoint, "findUnique").mockResolvedValue(checkpointMock as never);
    vi.spyOn(prisma.block, "findFirst").mockResolvedValue(blockMock as never);
    vi.spyOn(prisma.block, "findMany").mockResolvedValue([blockMock] as never);
    vi.spyOn(prisma.indexedBatch, "findMany").mockResolvedValue([batchMock] as never);
    vi.spyOn(prisma.indexedBatch, "findUnique").mockResolvedValue(batchMock as never);
    vi.spyOn(prisma.transaction, "findMany").mockResolvedValue([] as never);
    vi.spyOn(prisma.erc20Transfer, "findMany").mockResolvedValue([] as never);
    vi.spyOn(prisma.batchAttestation, "findMany").mockResolvedValue([] as never);
  });

  afterEach(() => {
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
});
