import { prisma } from "@db/prisma";
import { env } from "@config/env";
import { computeMerkleRootFromTransfers, TransferLike } from "@utils/merkle";
import { AttestationStatus } from "@prisma/client";

function buildBlocks(startBlock: number, count: number) {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, idx) => {
    const blockNumber = startBlock + idx;
    return {
      number: blockNumber,
      hash: `0x${(blockNumber + 1000).toString(16).padStart(64, "0")}`,
      parentHash: `0x${(blockNumber + 999).toString(16).padStart(64, "0")}`,
      timestamp: BigInt(now - (count - idx) * 12)
    };
  });
}

function buildTransfers(blocks: ReturnType<typeof buildBlocks>): TransferLike[] {
  const token = "0x000000000000000000000000000000000000dEaD";
  return blocks.flatMap((block, blockIdx) =>
    Array.from({ length: 2 }, (_, idx) => {
      const sequence = blockIdx * 2 + idx + 1;
      return {
        txHash: `0x${(block.number + sequence).toString(16).padStart(64, "0")}`,
        logIndex: idx,
        blockNumber: block.number,
        token,
        from: `0x${(1000 + sequence).toString(16).padStart(40, "0")}`,
        to: `0x${(2000 + sequence).toString(16).padStart(40, "0")}`,
        value: (1000n + BigInt(sequence)).toString()
      };
    })
  );
}

async function main() {
  const chainId = env.CHAIN_ID;
  const proverAddress = env.MOCK_PROVER_ADDRESS;
  const attestorAddress = env.MOCK_ATTESTOR_ADDRESS;
  const startBlock = Math.max((env.START_BLOCK ?? 5_600_000) - 20, 0);
  const blocks = buildBlocks(startBlock, 4);
  const firstBlockNumber = blocks[0]?.number ?? startBlock;
  const lastBlockNumber = blocks[blocks.length - 1]?.number ?? startBlock;
  const transfers = buildTransfers(blocks);
  const transactions = transfers.map((transfer) => ({
    chainId,
    hash: transfer.txHash,
    blockNumber: transfer.blockNumber,
    from: transfer.from,
    to: transfer.to,
    value: transfer.value
  }));
  const poiMerkleRoot = computeMerkleRootFromTransfers(transfers);
  const batchId = `${chainId}:${firstBlockNumber}:${lastBlockNumber}`;
  const safeBlockNumber = lastBlockNumber + env.CONFIRMATIONS;

  await prisma.$transaction(async (tx) => {
    for (const block of blocks) {
      await tx.block.upsert({
        where: {
          chainId_number: {
            chainId,
            number: block.number
          }
        },
        update: {
          hash: block.hash,
          parentHash: block.parentHash,
          timestamp: block.timestamp
        },
        create: {
          chainId,
          number: block.number,
          hash: block.hash,
          parentHash: block.parentHash,
          timestamp: block.timestamp
        }
      });
    }

    if (transactions.length > 0) {
      await tx.transaction.createMany({
        data: transactions,
        skipDuplicates: true
      });
    }

    await tx.erc20Transfer.createMany({
      data: transfers.map((transfer) => ({
        chainId,
        id: `${transfer.txHash}-${transfer.logIndex}`,
        txHash: transfer.txHash,
        logIndex: transfer.logIndex,
        blockNumber: transfer.blockNumber,
        token: transfer.token,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value
      })),
      skipDuplicates: true
    });

    await tx.indexedBatch.upsert({
      where: {
        chainId_id: {
          chainId,
          id: batchId
        }
      },
      update: {
        startBlock: firstBlockNumber,
        endBlock: lastBlockNumber,
        poiMerkleRoot,
        poiLeafCount: transfers.length,
        safeBlockNumber,
        totalBlocks: blocks.length,
        totalTransactions: transactions.length,
        totalTransfers: transfers.length,
        proverAddress
      },
      create: {
        chainId,
        id: batchId,
        startBlock: firstBlockNumber,
        endBlock: lastBlockNumber,
        poiMerkleRoot,
        poiLeafCount: transfers.length,
        safeBlockNumber,
        totalBlocks: blocks.length,
        totalTransactions: transactions.length,
        totalTransfers: transfers.length,
        proverAddress
      }
    });

    await tx.batchAttestation.upsert({
      where: {
        chainId_id: {
          chainId,
          id: `${batchId}:attestor`
        }
      },
      update: {
        status: AttestationStatus.VALID,
        merkleRoot: poiMerkleRoot,
        attestor: attestorAddress
      },
      create: {
        chainId,
        id: `${batchId}:attestor`,
        batchId,
        attestor: attestorAddress,
        merkleRoot: poiMerkleRoot,
        status: AttestationStatus.VALID
      }
    });

    await tx.indexerCheckpoint.upsert({
      where: { chainId },
      update: {
        lastIndexedBlock: lastBlockNumber,
        safeBlockNumber
      },
      create: {
        chainId,
        lastIndexedBlock: lastBlockNumber,
        safeBlockNumber
      }
    });
  });

  console.info(
    `[seed] Prepared ${blocks.length} blocks, ${transactions.length} transactions and ${transfers.length} transfers for ${chainId}`
  );
}

main()
  .catch(async (error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
