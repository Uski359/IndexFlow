#!/usr/bin/env node
require('dotenv/config');
const { ethers } = require('ethers');

const ERC20_TRANSFER_TOPIC = ethers.utils.id('Transfer(address,address,uint256)');
const ERC20_INTERFACE = new ethers.utils.Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const DEFAULT_BLOCK_RANGE = Number.parseInt(process.env.MULTICHAIN_BLOCK_RANGE ?? '200', 10);

const networks = [
  {
    name: 'sepolia',
    rpc: process.env.RPC_URL,
    confirmations: Number.parseInt(process.env.CONFIRMATIONS ?? '12', 10),
  },
  {
    name: 'base',
    rpc: process.env.BASE_RPC_URL,
    confirmations: Number.parseInt(process.env.BASE_CONFIRMATIONS ?? '12', 10),
  },
  {
    name: 'polygon',
    rpc: process.env.POLYGON_RPC_URL,
    confirmations: Number.parseInt(process.env.POLYGON_CONFIRMATIONS ?? '15', 10),
  },
].filter((network) => network.rpc && network.rpc.trim().length > 0);

if (networks.length === 0) {
  console.error('No RPC endpoints configured. Set at least RPC_URL, BASE_RPC_URL, or POLYGON_RPC_URL.');
  process.exit(1);
}

function isLogResultLimitError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const err = error;
  if (err.code === -32005) {
    return true;
  }
  if (err.error?.code === -32005) {
    return true;
  }
  return false;
}

async function fetchTransfers(provider, fromBlock, toBlock) {
  const transfers = [];

  const fetchRange = async (start, end) => {
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
          transfers.push({
            txHash: log.transactionHash.toLowerCase(),
            blockNumber: log.blockNumber,
            token: log.address.toLowerCase(),
            from: parsed.args[0].toLowerCase(),
            to: parsed.args[1].toLowerCase(),
            value: parsed.args[2].toString(),
            logIndex: log.logIndex,
          });
        } catch (parseErr) {
          console.warn('Failed to parse log', parseErr);
        }
      }
    } catch (err) {
      if (isLogResultLimitError(err)) {
        if (start === end) {
          console.warn(
            `Skipping block ${start} due to provider log result limit (>=10000 logs in single block).`,
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
  return transfers;
}

async function processNetwork(network, blockRange) {
  const provider = new ethers.providers.JsonRpcProvider(network.rpc);
  const latestBlock = await provider.getBlockNumber();
  const safeBlock = latestBlock - Math.max(network.confirmations, 0);
  const fromBlock = Math.max(safeBlock - Math.max(blockRange - 1, 0), 0);

  const transfers = await fetchTransfers(provider, fromBlock, safeBlock);

  const uniqueTokens = new Set();
  const uniqueAddresses = new Set();
  for (const transfer of transfers) {
    uniqueTokens.add(transfer.token);
    uniqueAddresses.add(transfer.from);
    uniqueAddresses.add(transfer.to);
  }

  const sample = transfers.slice(0, 5);

  return {
    network: network.name,
    latestBlock,
    safeBlock,
    fromBlock,
    transferCount: transfers.length,
    tokenCount: uniqueTokens.size,
    addressCount: uniqueAddresses.size,
    sample,
  };
}

async function main() {
  const blockRange = Number.isFinite(DEFAULT_BLOCK_RANGE) ? DEFAULT_BLOCK_RANGE : 200;
  console.log(`Fetching ERC-20 transfers across ${networks.length} networks (range: ${blockRange} blocks)...`);

  const results = [];
  for (const network of networks) {
    try {
      const summary = await processNetwork(network, blockRange);
      results.push(summary);
    } catch (err) {
      console.error(`Failed to process ${network.name}`, err);
    }
  }

  for (const result of results) {
    console.log('---');
    console.log(`Network: ${result.network}`);
    console.log(`Latest block: ${result.latestBlock}`);
    console.log(`Safe block:   ${result.safeBlock}`);
    console.log(`Window:       ${result.fromBlock} -> ${result.safeBlock}`);
    console.log(`Transfers:    ${result.transferCount}`);
    console.log(`Tokens:       ${result.tokenCount}`);
    console.log(`Addresses:    ${result.addressCount}`);
    if (result.sample.length > 0) {
      console.log('Sample transfers:');
      for (const transfer of result.sample) {
        console.log(
          `  Block ${transfer.blockNumber} | Token ${transfer.token} | ${transfer.from} -> ${transfer.to} | value=${transfer.value}`,
        );
      }
    } else {
      console.log('No transfers found in range.');
    }
  }
}

main()
  .catch((err) => {
    console.error('multichain_fetch failed', err);
    process.exit(1);
  });
