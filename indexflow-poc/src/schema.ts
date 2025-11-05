import { PrismaClient, Prisma } from '@prisma/client';
import { makeExecutableSchema } from '@graphql-tools/schema';

export interface Context {
  prisma: PrismaClient;
}

const typeDefs = /* GraphQL */ `
  type Transfer {
    chainId: String!
    txHash: String!
    from: String!
    to: String!
    value: String!
    token: String!
    blockNumber: Int!
  }

  type Block {
    chainId: String!
    number: Int!
    hash: String!
    parentHash: String!
    timestamp: String!
    txCount: Int!
  }

  enum AttestationStatus {
    VALID
    INVALID
  }

  type BatchAttestation {
    chainId: String!
    id: ID!
    attestor: String!
    merkleRoot: String!
    status: AttestationStatus!
    signature: String
    createdAt: String!
  }

  type IndexedBatch {
    chainId: String!
    id: ID!
    startBlock: Int!
    endBlock: Int!
    merkleRoot: String!
    totalBlocks: Int!
    totalTransactions: Int!
    totalTransfers: Int!
    proverAddress: String
    proverSignature: String
    createdAt: String!
    updatedAt: String!
    attestations: [BatchAttestation!]!
  }

  type Query {
    transfers(chainId: String, limit: Int = 10, token: String, from: String, to: String): [Transfer!]!
    block(chainId: String!, number: Int!): Block
    health: String!
    batches(chainId: String, limit: Int = 10): [IndexedBatch!]!
  }
`;

type TransfersArgs = {
  chainId?: string | null;
  limit?: number | null;
  token?: string | null;
  from?: string | null;
  to?: string | null;
};

type BlockArgs = {
  chainId: string;
  number: number;
};

type BatchesArgs = {
  chainId?: string | null;
  limit?: number | null;
};

const resolvers = {
  Query: {
    transfers: async (_: unknown, args: TransfersArgs, ctx: Context) => {
      const { prisma } = ctx;
       const chainId = args.chainId ?? 'sepolia';
      const limitArg = typeof args.limit === 'number' ? args.limit : 10;
      const limit = Math.min(Math.max(limitArg, 1), 100);

      const where: Prisma.Erc20TransferWhereInput = { chainId };
      if (args.token) {
        where.token = args.token.toLowerCase();
      }
      if (args.from) {
        where.from = args.from.toLowerCase();
      }
      if (args.to) {
        where.to = args.to.toLowerCase();
      }

      const transfers = await prisma.erc20Transfer.findMany({
        where,
        orderBy: { blockNumber: 'desc' },
        take: limit,
      });

      return transfers.map((transfer) => ({
        chainId: transfer.chainId,
        txHash: transfer.txHash,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value,
        token: transfer.token,
        blockNumber: transfer.blockNumber,
      }));
    },
    block: async (_: unknown, args: BlockArgs, ctx: Context) => {
      const { prisma } = ctx;
      const block = await prisma.block.findUnique({
        where: { chainId_number: { chainId: args.chainId, number: args.number } },
        include: { _count: { select: { transactions: true } } },
      });

      if (!block) {
        return null;
      }

      return {
        chainId: block.chainId,
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: block.timestamp.toString(),
        txCount: block._count.transactions,
      };
    },
    health: async (_: unknown, __: unknown, ctx: Context) => {
      const { prisma } = ctx;
      const perChain = await prisma.block.groupBy({
        by: ['chainId'],
        _max: { number: true },
      });
      if (perChain.length === 0) {
        return 'ok: empty';
      }
      const parts = perChain
        .map((entry) => `${entry.chainId}:${entry._max.number ?? 'n/a'}`)
        .join(', ');
      return `ok: ${parts}`;
    },
    batches: async (_: unknown, args: BatchesArgs, ctx: Context) => {
      const { prisma } = ctx;
      const chainId = args.chainId ?? 'sepolia';
      const limitArg = typeof args.limit === 'number' ? args.limit : 10;
      const limit = Math.min(Math.max(limitArg, 1), 100);

      const batches = await prisma.indexedBatch.findMany({
        where: { chainId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { attestations: { orderBy: { createdAt: 'desc' } } },
      });

      return batches.map((batch) => ({
        chainId: batch.chainId,
        id: batch.id,
        startBlock: batch.startBlock,
        endBlock: batch.endBlock,
        merkleRoot: batch.merkleRoot,
        totalBlocks: batch.totalBlocks,
        totalTransactions: batch.totalTransactions,
        totalTransfers: batch.totalTransfers,
        proverAddress: batch.proverAddress,
        proverSignature: batch.proverSignature,
        createdAt: batch.createdAt.toISOString(),
        updatedAt: batch.updatedAt.toISOString(),
        attestations: batch.attestations.map((attestation) => ({
          chainId: attestation.chainId,
          id: attestation.id,
          attestor: attestation.attestor,
          merkleRoot: attestation.merkleRoot,
          status: attestation.status,
          signature: attestation.signature,
          createdAt: attestation.createdAt.toISOString(),
        })),
      }));
    },
  },
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
