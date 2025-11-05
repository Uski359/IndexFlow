import { GraphQLScalarType, Kind } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { prisma } from "@db/prisma";
import { env } from "@config/env";
import { requestProofOfSql } from "@proofs/sql";

const typeDefs = /* GraphQL */ `
  scalar BigInt

  type Block {
    chainId: String!
    number: Int!
    hash: String!
    parentHash: String!
    timestamp: BigInt!
    transactions(limit: Int = 25, cursor: String): TransactionConnection!
    transfers(limit: Int = 25, cursor: String): TransferConnection!
  }

  type Transaction {
    hash: String!
    from: String!
    to: String
    value: String!
    blockNumber: Int!
  }

  type Erc20Transfer {
    id: String!
    txHash: String!
    logIndex: Int!
    blockNumber: Int!
    token: String!
    from: String!
    to: String!
    value: String!
  }

  type TransactionConnection {
    items: [Transaction!]!
    nextCursor: String
  }

  type TransferConnection {
    items: [Erc20Transfer!]!
    nextCursor: String
  }

  type BlockConnection {
    items: [Block!]!
    nextCursor: Int
  }

  type IndexedBatch {
    id: String!
    startBlock: Int!
    endBlock: Int!
    poiMerkleRoot: String!
    poiLeafCount: Int!
    safeBlockNumber: Int!
    totalBlocks: Int!
    totalTransactions: Int!
    totalTransfers: Int!
    createdAt: String!
    attestations: [BatchAttestation!]!
  }

  type BatchAttestation {
    id: String!
    attestor: String!
    merkleRoot: String!
    status: String!
    signature: String
    createdAt: String!
  }

  type ProofOfIndexing {
    batchId: String!
    poiMerkleRoot: String!
    poiLeafCount: Int!
    safeBlockNumber: Int!
    totalTransfers: Int!
    totalTransactions: Int!
    computedAt: String!
  }

  type ProofOfSqlResponse {
    requestId: String!
    status: String!
    message: String!
    etaSeconds: Int!
  }

  type IndexerStatus {
    lastIndexedBlock: Int!
    safeBlockNumber: Int!
    lastIndexedHash: String
    updatedAt: String!
  }

  type Query {
    health: IndexerStatus!
    latestBlock: Block
    blocks(limit: Int = 10, cursor: Int): BlockConnection!
    indexedBatches(limit: Int = 20, cursor: String): [IndexedBatch!]!
    proofOfIndexing(batchId: String!): ProofOfIndexing
    proofOfSql(query: String!): ProofOfSqlResponse!
  }
`;

const BigIntScalar = new GraphQLScalarType({
  name: "BigInt",
  description: "String serialized representation of JavaScript bigint",
  serialize(value) {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "string") {
      return value;
    }
    throw new TypeError(`Cannot serialize value as BigInt: ${value}`);
  },
  parseValue(value) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
      return BigInt(value);
    }
    throw new TypeError(`Cannot parse value as BigInt: ${value}`);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      return BigInt(ast.value);
    }
    return null;
  }
});

export const resolvers = {
  BigInt: BigIntScalar,
  Query: {
    health: async () => {
      const checkpoint = await prisma.indexerCheckpoint.findUnique({
        where: { chainId: env.CHAIN_ID }
      });
      return checkpoint ?? {
        lastIndexedBlock: 0,
        safeBlockNumber: 0,
        lastIndexedHash: null,
        updatedAt: new Date().toISOString()
      };
    },
    latestBlock: async () => {
      return prisma.block.findFirst({
        where: { chainId: env.CHAIN_ID },
        orderBy: { number: "desc" }
      });
    },
    blocks: async (_: unknown, args: { limit?: number; cursor?: number }) => {
      const limit = Math.min(args.limit ?? 10, 100);
      const blocks = await prisma.block.findMany({
        where: { chainId: env.CHAIN_ID },
        orderBy: { number: "desc" },
        take: limit,
        ...(args.cursor !== undefined
          ? {
              skip: 1,
              cursor: {
                chainId_number: {
                  chainId: env.CHAIN_ID,
                  number: args.cursor
                }
              }
            }
          : {})
      });
      const nextCursor = blocks.length === limit ? blocks[blocks.length - 1].number : null;
      return {
        items: blocks,
        nextCursor
      };
    },
    indexedBatches: async (_: unknown, args: { limit?: number; cursor?: string }) => {
      const limit = Math.min(args.limit ?? 20, 100);
      return prisma.indexedBatch.findMany({
        where: { chainId: env.CHAIN_ID },
        orderBy: { createdAt: "desc" },
        take: limit,
        ...(args.cursor
          ? {
              skip: 1,
              cursor: {
                chainId_id: {
                  chainId: env.CHAIN_ID,
                  id: args.cursor
                }
              }
            }
          : {})
      });
    },
    proofOfIndexing: async (_: unknown, args: { batchId: string }) => {
      const batch = await prisma.indexedBatch.findUnique({
        where: {
          chainId_id: {
            chainId: env.CHAIN_ID,
            id: args.batchId
          }
        }
      });
      if (!batch) {
        return null;
      }
      return {
        batchId: batch.id,
        poiMerkleRoot: batch.poiMerkleRoot,
        poiLeafCount: batch.poiLeafCount,
        safeBlockNumber: batch.safeBlockNumber,
        totalTransfers: batch.totalTransfers,
        totalTransactions: batch.totalTransactions,
        computedAt: batch.updatedAt.toISOString()
      };
    },
    proofOfSql: async (_: unknown, args: { query: string }) => {
      const result = await requestProofOfSql(args.query);
      return {
        requestId: result.id,
        status: result.status,
        message: "Proof of SQL generation queued (placeholder)",
        etaSeconds: result.etaSeconds
      };
    }
  },
  Block: {
    transactions: async (parent: { number: number }, args: { limit?: number; cursor?: string }) => {
      const limit = Math.min(args.limit ?? 25, 200);
      const transactions = await prisma.transaction.findMany({
        where: {
          chainId: env.CHAIN_ID,
          blockNumber: parent.number
        },
        orderBy: { hash: "asc" },
        take: limit,
        ...(args.cursor
          ? {
              skip: 1,
              cursor: {
                chainId_hash: {
                  chainId: env.CHAIN_ID,
                  hash: args.cursor
                }
              }
            }
          : {})
      });
      const nextCursor =
        transactions.length === limit ? transactions[transactions.length - 1].hash : null;
      return {
        items: transactions,
        nextCursor
      };
    },
    transfers: async (parent: { number: number }, args: { limit?: number; cursor?: string }) => {
      const limit = Math.min(args.limit ?? 25, 200);
      const transfers = await prisma.erc20Transfer.findMany({
        where: {
          chainId: env.CHAIN_ID,
          blockNumber: parent.number
        },
        orderBy: { logIndex: "asc" },
        take: limit,
        ...(args.cursor
          ? {
              skip: 1,
              cursor: {
                chainId_id: {
                  chainId: env.CHAIN_ID,
                  id: args.cursor
                }
              }
            }
          : {})
      });
      const nextCursor =
        transfers.length === limit ? transfers[transfers.length - 1].id : null;
      return {
        items: transfers,
        nextCursor
      };
    }
  },
  IndexedBatch: {
    attestations: (parent: { id: string }) =>
      prisma.batchAttestation.findMany({
        where: {
          chainId: env.CHAIN_ID,
          batchId: parent.id
        },
        orderBy: { createdAt: "desc" }
      })
  }
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});
