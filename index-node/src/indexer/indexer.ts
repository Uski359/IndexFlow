import { Interface, Log, LogDescription, TransactionResponse } from "ethers";
import promiseRetry from "promise-retry";
import { env } from "@config/env";
import { prisma } from "@db/prisma";
import { provider } from "@indexer/provider";
import { logger } from "@telemetry/logger";
import { computeMerkleRootFromTransfers, TransferLike } from "@utils/merkle";
import { sleep } from "@utils/sleep";

const TRANSFER_INTERFACE = new Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)"
]);
const TRANSFER_EVENT = TRANSFER_INTERFACE.getEvent("Transfer");
if (!TRANSFER_EVENT) {
  throw new Error("Transfer event signature missing");
}
const TRANSFER_TOPIC = TRANSFER_EVENT.topicHash;

const BATCH_ID_SEPARATOR = ":";
const ZERO_HASH = `0x${"0".repeat(64)}`;

type ProviderBlock = Awaited<ReturnType<typeof provider.getBlock>>;
type BlockWithTransactions = ProviderBlock & { transactions: TransactionResponse[] };

export interface IndexerControl {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export class Indexer implements IndexerControl {
  private running = false;
  private nextBlockNumber: number | null = null;

  constructor(
    private readonly chainId = env.CHAIN_ID,
    private readonly batchSize = env.BATCH_SIZE,
    private readonly confirmations = env.CONFIRMATIONS,
    private readonly pollIntervalMs = env.INDEX_POLL_INTERVAL_MS
  ) {}

  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    await this.initializeCursor();

    while (this.running) {
      try {
        await this.runCycle();
      } catch (error) {
        logger.error({ error }, "Indexer cycle failed");
        await sleep(this.pollIntervalMs);
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  private async initializeCursor() {
    const checkpoint = await prisma.indexerCheckpoint.findUnique({
      where: { chainId: this.chainId }
    });

    if (checkpoint) {
      this.nextBlockNumber = checkpoint.lastIndexedBlock + 1;
      logger.info(
        {
          chainId: this.chainId,
          lastIndexedBlock: checkpoint.lastIndexedBlock,
          safeBlockNumber: checkpoint.safeBlockNumber
        },
        "Loaded existing indexer checkpoint"
      );
      return;
    }

    const latestBlock = await provider.getBlockNumber();
    const safeBlock = latestBlock - this.confirmations;
    const configuredStart = env.START_BLOCK;
    const startingBlock =
      configuredStart !== undefined
        ? configuredStart
        : Math.max(safeBlock - this.batchSize, 0);

    await prisma.indexerCheckpoint.create({
      data: {
        chainId: this.chainId,
        lastIndexedBlock: startingBlock - 1,
        safeBlockNumber: safeBlock,
        lastIndexedHash: null
      }
    });

    this.nextBlockNumber = startingBlock;
    logger.info(
      {
        chainId: this.chainId,
        startingBlock,
        safeBlock
      },
      "Initialized new indexer checkpoint"
    );
  }

  private async runCycle() {
    if (this.nextBlockNumber === null) {
      await this.initializeCursor();
      if (this.nextBlockNumber === null) {
        return;
      }
    }

    const latestBlockNumber = await provider.getBlockNumber();
    const safeBlockNumber = latestBlockNumber - this.confirmations;

    if (this.nextBlockNumber > safeBlockNumber) {
      logger.debug(
        {
          nextBlock: this.nextBlockNumber,
          safeBlockNumber,
          latestBlockNumber
        },
        "Awaiting new confirmations before indexing next batch"
      );
      await sleep(this.pollIntervalMs);
      return;
    }

    const batchStart = this.nextBlockNumber;
    const batchEnd = Math.min(
      batchStart + this.batchSize - 1,
      safeBlockNumber
    );

    const blocks = await this.fetchBlocks(batchStart, batchEnd);

    const [firstBlock] = blocks;
    if (!firstBlock) {
      await sleep(this.pollIntervalMs);
      return;
    }

    const reorgHandled = await this.detectAndHandleReorg(firstBlock);
    if (reorgHandled) {
      return;
    }

    const transfers = await this.fetchTransferLogs(batchStart, batchEnd);
    await this.persistBatch(blocks, transfers, batchStart, batchEnd, safeBlockNumber);

    this.nextBlockNumber = batchEnd + 1;
  }

  private async fetchBlocks(start: number, end: number): Promise<BlockWithTransactions[]> {
    const numbers = [];
    for (let i = start; i <= end; i += 1) {
      numbers.push(i);
    }

    const blocks = await Promise.all(
      numbers.map((blockNumber) =>
        promiseRetry<BlockWithTransactions>(
          async (retry) => {
            try {
              const block = await provider.getBlock(blockNumber, true);
              if (!block) {
                throw new Error("Block not found");
              }
              if (
                Array.isArray(block.transactions) &&
                block.transactions.length > 0 &&
                typeof block.transactions[0] === "string"
              ) {
                throw new Error("Expected full transactions but received hashes");
              }
              return block as BlockWithTransactions;
            } catch (error) {
              logger.warn({ error, blockNumber }, "Failed to fetch block, retrying");
              retry(error as Error);
              throw error;
            }
          },
          { retries: 5, minTimeout: 500, maxTimeout: 2_000 }
        )
      )
    );

    return blocks;
  }

  private async fetchTransferLogs(startBlock: number, endBlock: number): Promise<TransferLike[]> {
    const rawLogs = await promiseRetry<Log[]>(
      async (retry) => {
        try {
          return await provider.getLogs({
            fromBlock: startBlock,
            toBlock: endBlock,
            topics: [TRANSFER_TOPIC]
          });
        } catch (error) {
          logger.warn({ error }, "Failed to fetch transfer logs, retrying");
          retry(error as Error);
          throw error;
        }
      },
      { retries: 5, minTimeout: 500, maxTimeout: 2_000 }
    );

    return rawLogs.map((log) => this.parseTransferLog(log)).filter(Boolean) as TransferLike[];
  }

  private parseTransferLog(log: Log): TransferLike | null {
    try {
      const parsed = TRANSFER_INTERFACE.parseLog(log) as LogDescription;
      const txHash = log.transactionHash ?? null;
      if (!txHash) {
        return null;
      }
      return {
        txHash,
        logIndex: Number(log.index ?? 0n),
        blockNumber: Number(log.blockNumber ?? 0n),
        token: log.address,
        from: parsed.args.from,
        to: parsed.args.to,
        value: parsed.args.value.toString()
      };
    } catch (error) {
      logger.warn({ error, log }, "Failed to parse ERC20 transfer log");
      return null;
    }
  }

  private async detectAndHandleReorg(firstBlock: BlockWithTransactions): Promise<boolean> {
    if (firstBlock.number === 0) {
      return false;
    }

    const previousBlock = await prisma.block.findUnique({
      where: {
        chainId_number: {
          chainId: this.chainId,
          number: firstBlock.number - 1
        }
      },
      select: { hash: true }
    });

    if (previousBlock && previousBlock.hash !== firstBlock.parentHash) {
      logger.warn(
        {
          expectedParent: previousBlock.hash,
          actualParent: firstBlock.parentHash,
          blockNumber: firstBlock.number
        },
        "Detected chain reorg, rolling back indexed data"
      );
      await this.handleReorg(firstBlock.number - 1);
      return true;
    }
    return false;
  }

  private async handleReorg(revertToBlock: number) {
    await prisma.$transaction(async (tx) => {
      await tx.indexedBatch.deleteMany({
        where: {
          chainId: this.chainId,
          endBlock: { gt: revertToBlock }
        }
      });
      await tx.block.deleteMany({
        where: {
          chainId: this.chainId,
          number: { gt: revertToBlock }
        }
      });

      const parentBlock = revertToBlock >= 0
        ? await tx.block.findUnique({
            where: {
              chainId_number: {
                chainId: this.chainId,
                number: revertToBlock
              }
            },
            select: { hash: true }
          })
        : null;

      await tx.indexerCheckpoint.upsert({
        where: { chainId: this.chainId },
        update: {
          lastIndexedBlock: revertToBlock,
          lastIndexedHash: parentBlock?.hash ?? null,
          safeBlockNumber: Math.max(revertToBlock - this.confirmations, 0)
        },
        create: {
          chainId: this.chainId,
          lastIndexedBlock: revertToBlock,
          lastIndexedHash: parentBlock?.hash ?? null,
          safeBlockNumber: Math.max(revertToBlock - this.confirmations, 0)
        }
      });
    });

    this.nextBlockNumber = Math.max(revertToBlock + 1, 0);
  }

  private async persistBatch(
    blocks: BlockWithTransactions[],
    transfers: TransferLike[],
    start: number,
    end: number,
    safeBlockNumber: number
  ) {
    const batchId = [this.chainId, start, end].join(BATCH_ID_SEPARATOR);
    const totalTransactions = blocks.reduce(
      (acc, block) => acc + block.transactions.length,
      0
    );

    const poiMerkleRoot = computeMerkleRootFromTransfers(transfers);

    await prisma.$transaction(async (tx) => {
      for (const block of blocks) {
        await tx.transaction.deleteMany({
          where: { chainId: this.chainId, blockNumber: block.number }
        });
        await tx.erc20Transfer.deleteMany({
          where: { chainId: this.chainId, blockNumber: block.number }
        });

        await tx.block.upsert({
          where: {
            chainId_number: {
              chainId: this.chainId,
              number: block.number
            }
          },
          update: {
            hash: block.hash ?? ZERO_HASH,
            parentHash: block.parentHash ?? ZERO_HASH,
            timestamp: BigInt(block.timestamp)
          },
          create: {
            chainId: this.chainId,
            number: block.number,
            hash: block.hash ?? ZERO_HASH,
            parentHash: block.parentHash ?? ZERO_HASH,
            timestamp: BigInt(block.timestamp)
          }
        });

        if (block.transactions.length > 0) {
          const txRows = block.transactions.map((txResponse: TransactionResponse) => ({
            chainId: this.chainId,
            hash: txResponse.hash,
            blockNumber: block.number,
            from: txResponse.from,
            to: txResponse.to ?? null,
            value: txResponse.value.toString()
          }));

          await tx.transaction.createMany({
            data: txRows,
            skipDuplicates: true
          });
        }
      }

      if (transfers.length > 0) {
        const transferRows = transfers.map((transfer) => ({
          chainId: this.chainId,
          id: `${transfer.txHash}-${transfer.logIndex}`,
          txHash: transfer.txHash,
          logIndex: transfer.logIndex,
          blockNumber: transfer.blockNumber,
          token: transfer.token,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value
        }));

        await tx.erc20Transfer.createMany({
          data: transferRows,
          skipDuplicates: true
        });
      }

      await tx.indexedBatch.upsert({
        where: {
          chainId_id: {
            chainId: this.chainId,
            id: batchId
          }
        },
        update: {
          startBlock: start,
          endBlock: end,
          poiMerkleRoot,
          poiLeafCount: transfers.length,
          safeBlockNumber,
          totalBlocks: blocks.length,
          totalTransactions,
          totalTransfers: transfers.length
        },
        create: {
          chainId: this.chainId,
          id: batchId,
          startBlock: start,
          endBlock: end,
          poiMerkleRoot,
          poiLeafCount: transfers.length,
          safeBlockNumber,
          totalBlocks: blocks.length,
          totalTransactions,
          totalTransfers: transfers.length
        }
      });

      const lastBlock = blocks[blocks.length - 1];
      await tx.indexerCheckpoint.upsert({
        where: { chainId: this.chainId },
        update: {
          lastIndexedBlock: end,
          lastIndexedHash: lastBlock.hash ?? undefined,
          safeBlockNumber
        },
        create: {
          chainId: this.chainId,
          lastIndexedBlock: end,
          lastIndexedHash: lastBlock.hash ?? undefined,
          safeBlockNumber
        }
      });
    });

    logger.info(
      {
        chainId: this.chainId,
        batchStart: start,
        batchEnd: end,
        transfers: transfers.length,
        transactions: totalTransactions,
        poiMerkleRoot
      },
      "Indexed new batch"
    );
  }
}

export const indexer = new Indexer();
