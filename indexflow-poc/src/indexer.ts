import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'ethers';
import { computeMerkleRootFromTransfers, TransferLike } from './utils/merkle';

const prisma = new PrismaClient();

const BATCH_SIZE = parseIntEnv('BATCH_SIZE', 500);
const POLL_INTERVAL_MS = parseIntEnv('POLL_INTERVAL_MS', 5000);
const PROVER_PRIVATE_KEY = process.env.PROVER_PRIVATE_KEY;
const proverWallet = PROVER_PRIVATE_KEY ? new ethers.Wallet(PROVER_PRIVATE_KEY) : null;

const ERC20_TRANSFER_TOPIC = ethers.utils.id('Transfer(address,address,uint256)');
const ERC20_INTERFACE = new ethers.utils.Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

type ChainConfig = {
  id: string;
  rpcUrl: string;
  startBlock: number;
  confirmations: number;
};

type ChainState = {
  config: ChainConfig;
  provider: ethers.providers.JsonRpcProvider;
  nextBlock: number;
  retryDelay: number;
  cooldownUntil: number;
};

type DecodedTransfer = TransferLike & {
  chainId: string;
  id: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildChainConfigs(): ChainConfig[] {
  const configs: ChainConfig[] = [];

  const baseConfigMap: Record<string, ChainConfig | undefined> = {
    sepolia: process.env.RPC_URL
      ? {
          id: 'sepolia',
          rpcUrl: process.env.RPC_URL,
          startBlock: parseIntEnv('START_BLOCK', 0),
          confirmations: parseIntEnv('CONFIRMATIONS', 12),
        }
      : undefined,
    base: process.env.BASE_RPC_URL
      ? {
          id: 'base',
          rpcUrl: process.env.BASE_RPC_URL,
          startBlock: parseIntEnv('BASE_START_BLOCK', 0),
          confirmations: parseIntEnv('BASE_CONFIRMATIONS', 12),
        }
      : undefined,
    polygon: process.env.POLYGON_RPC_URL
      ? {
          id: 'polygon',
          rpcUrl: process.env.POLYGON_RPC_URL,
          startBlock: parseIntEnv('POLYGON_START_BLOCK', 0),
          confirmations: parseIntEnv('POLYGON_CONFIRMATIONS', 15),
        }
      : undefined,
  };

  const desired = process.env.CHAIN_IDS
    ? process.env.CHAIN_IDS.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean)
    : Object.keys(baseConfigMap);

  for (const id of desired) {
    const config = baseConfigMap[id];
    if (config) {
      configs.push(config);
    }
  }

  if (configs.length === 0) {
    throw new Error(
      'No chain configuration found. Provide at least RPC_URL (Sepolia) or set CHAIN_IDS to the chains you want to index.',
    );
  }

  return configs;
}

async function getLastIndexedBlock(chainId: string): Promise<number | null> {
  const block = await prisma.block.findFirst({
    where: { chainId },
    orderBy: { number: 'desc' },
  });
  return block ? block.number : null;
}

function isLogResultLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error as { code?: unknown; error?: { code?: unknown } };
  return err.code === -32005 || err.error?.code === -32005;
}

async function fetchTransfers(
  chainId: string,
  provider: ethers.providers.JsonRpcProvider,
  fromBlock: number,
  toBlock: number,
): Promise<Map<string, DecodedTransfer[]>> {
  const transfersByTx = new Map<string, DecodedTransfer[]>();

  const fetchRange = async (start: number, end: number): Promise<void> => {
    if (start > end) {
      return;
    }

    try {
      const logs = await provider.getLogs({
        fromBlock: start,
        toBlock: end,
        topics: [ERC20_TRANSFER_TOPIC],
      });

      for (const log of logs) {
        if (!log.transactionHash) {
          continue;
        }
        try {
          const parsed = ERC20_INTERFACE.parseLog(log);
          const from = (parsed.args[0] as string).toLowerCase();
          const to = (parsed.args[1] as string).toLowerCase();
          const value = (parsed.args[2] as ethers.BigNumber).toString();
          const token = log.address.toLowerCase();
          const txHash = log.transactionHash.toLowerCase();
          const id = `${chainId}-${txHash}-${log.logIndex}`;

          const decoded: DecodedTransfer = {
            chainId,
            id,
            txHash,
            logIndex: log.logIndex,
            blockNumber: log.blockNumber,
            token,
            from,
            to,
            value,
          };

          if (!transfersByTx.has(txHash)) {
            transfersByTx.set(txHash, []);
          }
          transfersByTx.get(txHash)!.push(decoded);
        } catch (parseErr) {
          console.warn(`[${chainId}] Failed to parse log`, parseErr);
        }
      }
    } catch (err) {
      if (isLogResultLimitError(err)) {
        if (start === end) {
          console.warn(
            `[${chainId}] Skipping block ${start} due to provider log limit (>=10000 logs).`,
          );
          return;
        }
        const mid = Math.floor((start + end) / 2);
        await fetchRange(start, mid);
        await fetchRange(mid + 1, end);
        return;
      }
      throw err;
    }
  };

  await fetchRange(fromBlock, toBlock);
  return transfersByTx;
}

async function processRange(
  chain: ChainState,
  fromBlock: number,
  toBlock: number,
): Promise<{
  blockCount: number;
  txCount: number;
  transferCount: number;
  merkleRoot: string;
  proverAddress: string | null;
  proverSignature: string | null;
}> {
  const { config, provider } = chain;
  const transfersByTx = await fetchTransfers(config.id, provider, fromBlock, toBlock);

  let blockCount = 0;
  let txCount = 0;
  let transferCount = 0;
  const batchTransfers: DecodedTransfer[] = [];

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 1) {
    const block = await provider.getBlockWithTransactions(blockNumber);
    if (!block) {
      continue;
    }

    await prisma.block.upsert({
      where: { chainId_number: { chainId: config.id, number: block.number } },
      update: {
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: BigInt(block.timestamp),
      },
      create: {
        chainId: config.id,
        number: block.number,
        hash: block.hash,
        parentHash: block.parentHash,
        timestamp: BigInt(block.timestamp),
      },
    });
    blockCount += 1;

    for (const tx of block.transactions) {
      const txHash = tx.hash.toLowerCase();
      await prisma.transaction.upsert({
        where: { chainId_hash: { chainId: config.id, hash: txHash } },
        update: {
          blockNumber: block.number,
          from: tx.from.toLowerCase(),
          to: tx.to ? tx.to.toLowerCase() : null,
          value: tx.value.toString(),
        },
        create: {
          chainId: config.id,
          hash: txHash,
          blockNumber: block.number,
          from: tx.from.toLowerCase(),
          to: tx.to ? tx.to.toLowerCase() : null,
          value: tx.value.toString(),
        },
      });
      txCount += 1;

      const transferEntries = transfersByTx.get(txHash) ?? [];
      for (const transfer of transferEntries) {
        await prisma.erc20Transfer.upsert({
          where: { chainId_id: { chainId: config.id, id: transfer.id } },
          update: {
            txHash: transfer.txHash,
            logIndex: transfer.logIndex,
            blockNumber: transfer.blockNumber,
            token: transfer.token,
            from: transfer.from,
            to: transfer.to,
            value: transfer.value,
          },
          create: {
            chainId: config.id,
            id: transfer.id,
            txHash: transfer.txHash,
            logIndex: transfer.logIndex,
            blockNumber: transfer.blockNumber,
            token: transfer.token,
            from: transfer.from,
            to: transfer.to,
            value: transfer.value,
          },
        });
        transferCount += 1;
        batchTransfers.push(transfer);
      }
    }
  }

  const merkleRoot = computeMerkleRootFromTransfers(batchTransfers);
  const batchId = `${config.id}-${fromBlock}-${toBlock}`;
  let proverSignature: string | null = null;
  let proverAddress: string | null = null;

  if (proverWallet) {
    const messageHash = ethers.utils.solidityKeccak256(
      ['string', 'string', 'uint256', 'uint256', 'bytes32'],
      ['INDEXFLOW_POI_BATCH', config.id, fromBlock, toBlock, merkleRoot],
    );
    proverSignature = await proverWallet.signMessage(ethers.utils.arrayify(messageHash));
    proverAddress = proverWallet.address.toLowerCase();
  }

  await prisma.indexedBatch.upsert({
    where: { chainId_id: { chainId: config.id, id: batchId } },
    update: {
      startBlock: fromBlock,
      endBlock: toBlock,
      merkleRoot,
      totalBlocks: blockCount,
      totalTransactions: txCount,
      totalTransfers: transferCount,
      proverSignature,
      proverAddress,
    },
    create: {
      chainId: config.id,
      id: batchId,
      startBlock: fromBlock,
      endBlock: toBlock,
      merkleRoot,
      totalBlocks: blockCount,
      totalTransactions: txCount,
      totalTransfers: transferCount,
      proverSignature,
      proverAddress,
    },
  });

  return { blockCount, txCount, transferCount, merkleRoot, proverAddress, proverSignature };
}

async function processChain(state: ChainState): Promise<void> {
  const now = Date.now();
  if (now < state.cooldownUntil) {
    return;
  }

  const { config, provider } = state;

  try {
    const latestBlock = await provider.getBlockNumber();
    const safeBlock = latestBlock - config.confirmations;

    if (safeBlock < config.startBlock) {
      state.nextBlock = config.startBlock;
      return;
    }

    if (safeBlock < state.nextBlock) {
      return;
    }

    const targetBlock = Math.min(state.nextBlock + BATCH_SIZE - 1, safeBlock);
    const stats = await processRange(state, state.nextBlock, targetBlock);

    console.log(
      `[${config.id}] Indexed ${state.nextBlock}-${targetBlock} (blocks: ${stats.blockCount}, txs: ${stats.txCount}, transfers: ${stats.transferCount}, root: ${stats.merkleRoot}${stats.proverSignature ? `, sig: ${stats.proverSignature.slice(0, 18)}...` : ''})`,
    );

    state.nextBlock = targetBlock + 1;
    state.retryDelay = 1_000;
    state.cooldownUntil = 0;
  } catch (err) {
    console.error(`[${config.id}] Indexer error`, err);
    state.retryDelay = Math.min(state.retryDelay * 2, 30_000);
    state.cooldownUntil = Date.now() + state.retryDelay;
  }
}

async function main() {
  await prisma.$connect();

  const configs = buildChainConfigs();
  const states: ChainState[] = [];

  for (const config of configs) {
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const lastIndexed = await getLastIndexedBlock(config.id);
    const nextBlock =
      lastIndexed !== null
        ? Math.max(config.startBlock, lastIndexed - config.confirmations)
        : config.startBlock;

    states.push({
      config,
      provider,
      nextBlock,
      retryDelay: 1_000,
      cooldownUntil: 0,
    });

    console.log(
      `[${config.id}] Starting indexer at block ${nextBlock} (confirmations=${config.confirmations})`,
    );
  }

  if (states.length === 0) {
    throw new Error('No chain states initialised. Check your environment configuration.');
  }

  while (true) {
    for (const state of states) {
      await processChain(state);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

main().catch(async (err) => {
  console.error('Indexer failed to start', err);
  await prisma.$disconnect();
  process.exit(1);
});

const shutdown = async () => {
  console.log('Indexer shutting down...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
