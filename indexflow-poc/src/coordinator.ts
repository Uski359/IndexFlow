import 'dotenv/config';
import { promises as fs } from 'fs';
import { PrismaClient, AttestationStatus } from '@prisma/client';
import { computeMerkleRootFromTransfers, TransferLike } from './utils/merkle';

const prisma = new PrismaClient();

const epochMinutes = Number.parseInt(process.env.COORDINATOR_EPOCH_MINUTES ?? '60', 10);
const runIntervalMs = Number.parseInt(process.env.COORDINATOR_INTERVAL_MS ?? '60000', 10);
const sampleLimit = Number.parseInt(process.env.COORDINATOR_SAMPLE_LIMIT ?? '0', 10);
const outputPath = process.env.COORDINATOR_OUTPUT_PATH;
const runOnce = (process.env.COORDINATOR_RUN_ONCE ?? 'false').toLowerCase() === 'true';
const coordinatorChains =
  process.env.COORDINATOR_CHAINS?.split(',').map((c) => c.trim()).filter(Boolean) ?? ['sepolia'];

type BatchWithRelations = {
  chainId: string;
  id: string;
  startBlock: number;
  endBlock: number;
  merkleRoot: string;
  totalBlocks: number;
  totalTransactions: number;
  totalTransfers: number;
  proverAddress: string | null;
  proverSignature: string | null;
  createdAt: Date;
  updatedAt: Date;
  attestations: {
    chainId: string;
    id: string;
    attestor: string;
    status: AttestationStatus;
    merkleRoot: string;
    signature: string | null;
    createdAt: Date;
  }[];
};

type ProverAccumulator = {
  proverAddress: string;
  totalBatches: number;
  totalTransfers: number;
  totalBlocks: number;
  validAttestations: number;
  totalAttestations: number;
  verifiedBatches: number;
};

type AttestorAccumulator = {
  attestor: string;
  valid: number;
  invalid: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getEpochWindow(now: Date): { epochId: string; start: Date; end: Date } {
  const epochMs = Math.max(epochMinutes, 1) * 60 * 1000;
  const nowMs = now.getTime();
  const epochIndex = Math.floor(nowMs / epochMs);
  const end = new Date(epochIndex * epochMs);
  const start = new Date(end.getTime() - epochMs);
  return {
    epochId: `${epochIndex}`,
    start,
    end,
  };
}

function pickSample<T>(items: T[], limit: number): T[] {
  if (limit <= 0 || items.length <= limit) {
    return items;
  }
  const indexes = new Set<number>();
  while (indexes.size < limit) {
    indexes.add(Math.floor(Math.random() * items.length));
  }
  return Array.from(indexes).map((idx) => items[idx]);
}

async function verifyBatch(batch: BatchWithRelations): Promise<boolean> {
  const transfers = await prisma.erc20Transfer.findMany({
    where: {
      chainId: batch.chainId,
      blockNumber: {
        gte: batch.startBlock,
        lte: batch.endBlock,
      },
    },
    orderBy: [
      { blockNumber: 'asc' },
      { txHash: 'asc' },
      { logIndex: 'asc' },
    ],
  });

  const merkleRoot = computeMerkleRootFromTransfers(
    transfers.map(
      (transfer): TransferLike => ({
        txHash: transfer.txHash,
        logIndex: transfer.logIndex,
        blockNumber: transfer.blockNumber,
        token: transfer.token,
        from: transfer.from,
        to: transfer.to,
        value: transfer.value,
      }),
    ),
  );

  return merkleRoot === batch.merkleRoot;
}

async function buildEpochReport(chainId: string, now: Date) {
  const { epochId, start, end } = getEpochWindow(now);

  const batches = (await prisma.indexedBatch.findMany({
    where: {
      chainId,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    include: {
      attestations: true,
    },
    orderBy: { createdAt: 'asc' },
  })) as BatchWithRelations[];

  if (batches.length === 0) {
    return {
      chainId,
      epoch: { epochId, start: start.toISOString(), end: end.toISOString() },
      totals: { batches: 0, transfers: 0, blocks: 0, totalWeight: 0 },
      provers: [],
      attestors: [],
      verificationSample: { attempted: 0, verified: 0 },
    };
  }

  const sample = pickSample(batches, sampleLimit);
  let verifiedCount = 0;

  const proverStats = new Map<string, ProverAccumulator>();
  const attestorStats = new Map<string, AttestorAccumulator>();

  for (const batch of batches) {
    const proverKey = batch.proverAddress ?? 'unknown';
    if (!proverStats.has(proverKey)) {
      proverStats.set(proverKey, {
        proverAddress: proverKey,
        totalBatches: 0,
        totalTransfers: 0,
        totalBlocks: 0,
        validAttestations: 0,
        totalAttestations: 0,
        verifiedBatches: 0,
      });
    }
    const stats = proverStats.get(proverKey)!;
    stats.totalBatches += 1;
    stats.totalTransfers += batch.totalTransfers;
    stats.totalBlocks += batch.totalBlocks;
    stats.totalAttestations += batch.attestations.length;
    stats.validAttestations += batch.attestations.filter(
      (att) => att.status === AttestationStatus.VALID,
    ).length;

    for (const attestation of batch.attestations) {
      const key = attestation.attestor;
      if (!attestorStats.has(key)) {
        attestorStats.set(key, { attestor: key, valid: 0, invalid: 0 });
      }
      if (attestation.status === AttestationStatus.VALID) {
        attestorStats.get(key)!.valid += 1;
      } else {
        attestorStats.get(key)!.invalid += 1;
      }
    }
  }

  for (const batch of sample) {
    const valid = await verifyBatch(batch);
    if (valid) {
      const key = batch.proverAddress ?? 'unknown';
      const stats = proverStats.get(key);
      if (stats) {
        stats.verifiedBatches += 1;
      }
      verifiedCount += 1;
    } else {
      console.warn(
        `Verification mismatch for batch ${batch.id} (expected ${batch.merkleRoot})`,
      );
    }
  }

  const provers = Array.from(proverStats.values()).map((stats) => {
    const attestationSuccess =
      stats.totalAttestations > 0 ? stats.validAttestations / stats.totalAttestations : 0;
    const verificationRatio =
      stats.totalBatches > 0 ? stats.verifiedBatches / stats.totalBatches : 0;
    const coverage = stats.totalTransfers;
    const weight = coverage * (0.7 * attestationSuccess + 0.3 * verificationRatio);
    return {
      proverAddress: stats.proverAddress,
      totalBatches: stats.totalBatches,
      totalTransfers: stats.totalTransfers,
      totalBlocks: stats.totalBlocks,
      attestationSuccess,
      verificationRatio,
      weight,
    };
  });

  const totalWeight = provers.reduce((sum, row) => sum + row.weight, 0);
  const attestors = Array.from(attestorStats.values()).map((row) => ({
    attestor: row.attestor,
    valid: row.valid,
    invalid: row.invalid,
    successRate: row.valid + row.invalid > 0 ? row.valid / (row.valid + row.invalid) : 0,
  }));

  const payload = {
    chainId,
    epoch: { epochId, start: start.toISOString(), end: end.toISOString() },
    totals: {
      batches: batches.length,
      transfers: batches.reduce((sum, b) => sum + b.totalTransfers, 0),
      blocks: batches.reduce((sum, b) => sum + b.totalBlocks, 0),
      totalWeight,
    },
    provers: provers.sort((a, b) => b.weight - a.weight),
    attestors: attestors.sort((a, b) => b.successRate - a.successRate),
    verificationSample: { attempted: sample.length, verified: verifiedCount },
  };

  return payload;
}

async function runCoordinator() {
  await prisma.$connect();
  console.log(
    `Coordinator started (epochMinutes=${epochMinutes}, intervalMs=${runIntervalMs}, sampleLimit=${sampleLimit}, once=${runOnce})`,
  );

  const loop = async () => {
    const now = new Date();
    try {
      const reports = [];
      for (const chainId of coordinatorChains) {
        const report = await buildEpochReport(chainId, now);
        reports.push(report);
      }
      if (outputPath) {
        await fs.writeFile(
          outputPath,
          JSON.stringify({ generatedAt: now.toISOString(), reports }, null, 2),
          'utf-8',
        );
      }
      for (const report of reports) {
        console.log('--- Coordinator Epoch Report ---');
        console.log(JSON.stringify(report, null, 2));
      }
    } catch (err) {
      console.error('Coordinator run failed', err);
    }
  };

  await loop();

  if (runOnce) {
    await prisma.$disconnect();
    return;
  }

  while (true) {
    await sleep(Math.max(runIntervalMs, 1));
    await loop();
  }
}

runCoordinator().catch(async (err) => {
  console.error('Coordinator crashed', err);
  await prisma.$disconnect();
  process.exit(1);
});
