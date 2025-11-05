import 'dotenv/config';
import { PrismaClient, AttestationStatus } from '@prisma/client';
import { ethers } from 'ethers';
import { computeMerkleRootFromTransfers, TransferLike } from './utils/merkle';

const prisma = new PrismaClient();
const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
const verifierWallet = VERIFIER_PRIVATE_KEY ? new ethers.Wallet(VERIFIER_PRIVATE_KEY) : null;
const attestorId =
  process.env.VERIFIER_ID ?? verifierWallet?.address?.toLowerCase() ?? 'verifier-unknown';
const verifierChains =
  process.env.VERIFIER_CHAIN_IDS?.split(',').map((c) => c.trim()).filter(Boolean) ?? undefined;

async function verifyLatestBatches(limit: number) {
  const batches = await prisma.indexedBatch.findMany({
    where: verifierChains ? { chainId: { in: verifierChains } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  if (batches.length === 0) {
    console.log('No batches indexed yet.');
    return;
  }

  for (const batch of batches) {
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

    const status =
      merkleRoot === batch.merkleRoot ? AttestationStatus.VALID : AttestationStatus.INVALID;
    let signature: string | null = null;

    if (status === AttestationStatus.VALID && verifierWallet) {
      const messageHash = ethers.utils.solidityKeccak256(
        ['string', 'string', 'string', 'bytes32'],
        ['INDEXFLOW_POI_ATTEST', batch.chainId, batch.id, batch.merkleRoot],
      );
      signature = await verifierWallet.signMessage(ethers.utils.arrayify(messageHash));
    }

    await prisma.batchAttestation.upsert({
      where: { chainId_id: { chainId: batch.chainId, id: `${batch.id}-${attestorId}` } },
      update: {
        attestor: attestorId,
        merkleRoot,
        status,
        signature,
      },
      create: {
        chainId: batch.chainId,
        id: `${batch.id}-${attestorId}`,
        batchId: batch.id,
        attestor: attestorId,
        merkleRoot,
        status,
        signature,
      },
    });

    if (status === AttestationStatus.VALID) {
      console.log(
        `[${batch.chainId}] Batch ${batch.id} verified (blocks ${batch.startBlock}-${batch.endBlock}) root ${batch.merkleRoot}`,
      );
    } else {
      console.error(
        `[${batch.chainId}] Batch ${batch.id} mismatch! expected ${batch.merkleRoot}, recomputed ${merkleRoot}`,
      );
    }

    // TODO: Submit attestation / signature on verified batches for staking rewards.
  }
}

const limit = Number.parseInt(process.env.POI_BATCH_LIMIT ?? '5', 10);

verifyLatestBatches(limit)
  .catch((err) => {
    console.error('Verifier failed', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
