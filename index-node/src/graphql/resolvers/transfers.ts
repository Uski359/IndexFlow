import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";

import { env } from "@config/env";
import { prisma as prismaClient } from "@db/prisma";
import { encodeCursor, decodeCursorSafe } from "@utils/cursor";

const DEFAULT_TRANSFER_LIMIT = 20;
const MAX_TRANSFER_LIMIT = 500;

const coerceBigInt = (value?: bigint | number | string | null): bigint | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number") {
    return BigInt(value);
  }
  if (typeof value === "string" && value.length > 0) {
    return BigInt(value);
  }
  return undefined;
};

const buildTimestampFilter = (
  from?: bigint,
  to?: bigint
): Prisma.BigIntFilter | undefined => {
  if (from === undefined && to === undefined) {
    return undefined;
  }
  const filter: Prisma.BigIntFilter = {};
  if (from !== undefined) {
    filter.gte = from;
  }
  if (to !== undefined) {
    filter.lte = to;
  }
  return filter;
};

const buildBlockNumberFilter = (
  from?: number | null,
  to?: number | null
): Prisma.IntFilter | undefined => {
  const hasFrom = from !== undefined && from !== null;
  const hasTo = to !== undefined && to !== null;

  if (!hasFrom && !hasTo) {
    return undefined;
  }

  const filter: Prisma.IntFilter = {};
  if (hasFrom) {
    filter.gte = from as number;
  }
  if (hasTo) {
    filter.lte = to as number;
  }
  return filter;
};

const buildValueFilter = (
  min?: bigint | number | string | null,
  max?: bigint | number | string | null
): Prisma.StringFilter | undefined => {
  const from = coerceBigInt(min);
  const to = coerceBigInt(max);

  if (from === undefined && to === undefined) {
    return undefined;
  }

  const filter: Prisma.StringFilter = {};
  if (from !== undefined) {
    filter.gte = from.toString();
  }
  if (to !== undefined) {
    filter.lte = to.toString();
  }

  return filter;
};

const resolveDirection = (direction?: "ASC" | "DESC" | null): Prisma.SortOrder =>
  direction === "ASC" ? "asc" : "desc";

const buildTransferOrder = (direction: Prisma.SortOrder) => [
  { blockNumber: direction },
  { logIndex: direction },
  { id: direction }
];

export const transfers = async (_: unknown, args: any, ctx: any) => {
  const {
    chainId,
    fromBlock,
    toBlock,
    address,
    token,
    minValue,
    maxValue,
    cursor,
    limit = DEFAULT_TRANSFER_LIMIT,
    direction = "DESC",
    fromTimestamp,
    toTimestamp
  } = args;

  if (cursor && (fromBlock || toBlock)) {
    throw new GraphQLError("Cannot combine cursor with block-range filters.", {
      extensions: { code: "BAD_REQUEST", field: "transfers" }
    });
  }

  if (fromBlock && toBlock && fromBlock > toBlock) {
    throw new GraphQLError("fromBlock cannot be greater than toBlock.", {
      extensions: { code: "INVALID_RANGE", field: "fromBlock" }
    });
  }

  const cursorObj = cursor ? decodeCursorSafe(cursor) : null;
  if (cursor && !cursorObj) {
    throw new GraphQLError("Invalid or corrupted cursor.", {
      extensions: { code: "INVALID_CURSOR", field: "cursor" }
    });
  }

  const client = ctx?.prisma ?? prismaClient;
  const effectiveChainId = chainId ?? ctx?.chainId ?? env.CHAIN_ID;
  const take = Math.min(limit, MAX_TRANSFER_LIMIT);
  const prismaDirection = resolveDirection(direction);
  const fromTs = coerceBigInt(fromTimestamp);
  const toTs = coerceBigInt(toTimestamp);
  const timestampFilter = buildTimestampFilter(fromTs, toTs);
  const blockNumberFilter = buildBlockNumberFilter(fromBlock, toBlock);
  const valueFilter = buildValueFilter(minValue, maxValue);

  const where: Prisma.Erc20TransferWhereInput = {
    chainId: effectiveChainId
  };

  const andFilters: Prisma.Erc20TransferWhereInput[] = [];

  if (address) {
    andFilters.push({
      OR: [{ from: address }, { to: address }]
    });
  }

  if (token) {
    andFilters.push({ token });
  }

  if (valueFilter) {
    andFilters.push({ value: valueFilter });
  }

  if (blockNumberFilter) {
    where.blockNumber = blockNumberFilter;
  }

  if (timestampFilter) {
    where.block = { timestamp: timestampFilter };
  }

  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  const query: Prisma.Erc20TransferFindManyArgs = {
    where,
    orderBy: buildTransferOrder(prismaDirection),
    take,
    include: {
      block: {
        select: {
          timestamp: true
        }
      }
    }
  };

  if (cursorObj) {
    query.cursor = {
      chainId_id: {
        chainId: effectiveChainId,
        id: cursorObj.id
      }
    };
    query.skip = 1;
  }

  const results = await client.erc20Transfer.findMany(query);

  const normalized = results.map(
    (
      transfer: Prisma.Erc20TransferGetPayload<{
        include: { block: { select: { timestamp: true } } };
      }>
    ) => ({
      ...transfer,
      timestamp: transfer.block?.timestamp ?? BigInt(0)
    })
  );

  const last = normalized[normalized.length - 1];
  const nextCursor =
    normalized.length === take && last
      ? encodeCursor({
          id: last.id,
          blockNumber: last.blockNumber,
          logIndex: last.logIndex,
          txHash: last.txHash
        })
      : null;

  return {
    items: normalized,
    nextCursor
  };
};
