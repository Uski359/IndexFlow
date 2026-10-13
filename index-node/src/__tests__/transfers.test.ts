import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@db/prisma";
import { schema } from "@graphql/schema";
import { ApolloServer } from "@apollo/server";

let resolvers: any;
let decodeCursor: any;
let transferSpy: ReturnType<typeof vi.fn>;
const originalTransferFindMany = prisma.erc20Transfer.findMany;
let apollo: ApolloServer;

beforeAll(async () => {
  ({ resolvers, decodeCursor } = await import("@graphql/schema"));
  apollo = new ApolloServer({ schema });
  await apollo.start();
});

beforeEach(() => {
  transferSpy = vi.fn().mockResolvedValue([] as never);
  prisma.erc20Transfer.findMany = transferSpy as typeof prisma.erc20Transfer.findMany;
});

afterEach(() => {
  prisma.erc20Transfer.findMany = originalTransferFindMany;
  vi.restoreAllMocks();
});

afterAll(async () => {
  await apollo.stop();
});

const gqlRequest = async (query: string) => {
  const result = await apollo.executeOperation({
    query
  });
  if (result.body.kind === "single") {
    return result.body.singleResult;
  }
  return null;
};

describe("transfers resolver", () => {
  const makeTransfer = (index: number, blockNumber: number) => ({
    chainId: "sepolia",
    id: `id-${index}`,
    txHash: `tx-${index}`,
    logIndex: index,
    blockNumber,
    token: "0xtoken",
    from: "0xfrom",
    to: "0xto",
    value: "100",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    block: {
      timestamp: BigInt(1_700_000_000 + index)
    }
  });

  it("applies block number range filters alongside chainId", async () => {
    await resolvers.Query.transfers(null, {
      chainId: "custom-chain",
      fromBlock: 100,
      toBlock: 200,
      limit: 10
    });

    expect(transferSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          chainId: "custom-chain",
          blockNumber: {
            gte: 100,
            lte: 200
          }
        }),
        take: 10
      })
    );
  });

  it("rejects cursor pagination combined with block range filters", async () => {
    await expect(
      resolvers.Query.transfers(null, {
        cursor: "cursor-id",
        fromBlock: 50
      })
    ).rejects.toThrow("Cannot combine cursor with block-range filters.");

    expect(transferSpy).not.toHaveBeenCalled();
  });

  it("returns a forward page with an opaque cursor (limit=20)", async () => {
    const transfers = Array.from({ length: 20 }, (_, i) => makeTransfer(i, 200 - i));
    transferSpy.mockResolvedValueOnce(transfers as never);

    const result = await resolvers.Query.transfers(null, {
      chainId: "sepolia",
      limit: 20
    });

    expect(result.items).toHaveLength(20);
    expect(result.nextCursor).toBeTruthy();

    const cursorPayload = decodeCursor(result.nextCursor);
    expect(cursorPayload).toMatchObject({
      blockNumber: transfers[transfers.length - 1].blockNumber,
      txHash: transfers[transfers.length - 1].txHash,
      logIndex: transfers[transfers.length - 1].logIndex,
      id: transfers[transfers.length - 1].id
    });
  });

  it("uses cursor pagination across multiple pages", async () => {
    const firstPage = Array.from({ length: 20 }, (_, i) => makeTransfer(i, 200 - i));
    const secondPage = Array.from({ length: 5 }, (_, i) => makeTransfer(i + 20, 180 - i));

    transferSpy.mockResolvedValueOnce(firstPage as never).mockResolvedValueOnce(secondPage as never);

    const firstResult = await resolvers.Query.transfers(null, {
      chainId: "sepolia",
      limit: 20
    });

    const cursorPayload = decodeCursor(firstResult.nextCursor);

    expect(cursorPayload.id).toBe(firstPage[firstPage.length - 1].id);

    const secondResult = await resolvers.Query.transfers(null, {
      chainId: "sepolia",
      cursor: firstResult.nextCursor
    });

    const secondCallArgs = transferSpy.mock.calls[1][0];
    expect(secondCallArgs.skip).toBe(1);
    expect(secondCallArgs.cursor).toEqual({
      chainId_id: { chainId: "sepolia", id: firstPage[firstPage.length - 1].id }
    });

    expect(secondResult.items).toHaveLength(5);
    expect(secondResult.nextCursor).toBeNull();
  });

  it("applies address, token, and value range filters", async () => {
    await resolvers.Query.transfers(null, {
      address: "0xabc",
      token: "0xtoken",
      minValue: BigInt(1_000),
      maxValue: "2000"
    });

    expect(transferSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          chainId: "sepolia",
          AND: [
            { OR: [{ from: "0xabc" }, { to: "0xabc" }] },
            { token: "0xtoken" },
            { value: { gte: "1000", lte: "2000" } }
          ]
        })
      })
    );
  });

  it("throws BAD_REQUEST when cursor + range used together", async () => {
    const query = `
      query {
        transfers(cursor: "abc", fromBlock: 10) {
          items { txHash }
        }
      }
    `;
    const res = await gqlRequest(query);
    expect(res?.errors?.[0]?.extensions?.code).toBe("BAD_REQUEST");
  });

  it("throws INVALID_RANGE when fromBlock > toBlock", async () => {
    const query = `
      query {
        transfers(fromBlock: 100, toBlock: 50) {
          items { txHash }
        }
      }
    `;
    const res = await gqlRequest(query);
    expect(res?.errors?.[0]?.extensions?.code).toBe("INVALID_RANGE");
  });
});
