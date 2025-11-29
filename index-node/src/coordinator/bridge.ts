import { Contract, Wallet, ZeroHash, keccak256, toUtf8Bytes } from "ethers";
import { AttestationStatus, IndexedBatch, OnchainSubmissionStatus } from "@prisma/client";
import { env } from "@config/env";
import { prisma } from "@db/prisma";
import { primaryRpcProvider } from "@eth/client";
import { logger } from "@telemetry/logger";
import { recordOnchainSubmission } from "@telemetry/metrics";
import { sleep } from "@utils/sleep";
import { buildRewardPolicy, calculateReward } from "./rewards";

const REWARDS_ABI = [
  "function submitProof((bytes32 batchId,address indexer,bytes32 poiMerkleRoot,bytes32 sqlProofRoot,uint256 safeBlockNumber,uint256 rewardAmount)) external"
];

const SUBMITTABLE_STATUSES: OnchainSubmissionStatus[] = [
  OnchainSubmissionStatus.NOT_READY,
  OnchainSubmissionStatus.FAILED
];

export class CoordinatorBridge {
  private running = false;
  private readonly policy = buildRewardPolicy();
  private readonly enabled = env.COORDINATOR_ENABLED;
  private readonly dryRun = env.COORDINATOR_DRY_RUN;
  private readonly hasRequiredConfig =
    !!env.REWARDS_CONTRACT_ADDRESS &&
    !!env.COORDINATOR_PRIVATE_KEY &&
    env.COORDINATOR_PRIVATE_KEY.trim() !== "";
  private readonly rewardsContract?: Contract;

  constructor() {
    if (
      this.enabled &&
      this.hasRequiredConfig &&
      env.REWARDS_CONTRACT_ADDRESS &&
      env.COORDINATOR_PRIVATE_KEY
    ) {
      const signer = new Wallet(env.COORDINATOR_PRIVATE_KEY, primaryRpcProvider);
      this.rewardsContract = new Contract(env.REWARDS_CONTRACT_ADDRESS, REWARDS_ABI, signer);
    }
  }

  async start() {
    if (!this.enabled) {
      logger.info({ chainId: env.CHAIN_ID }, "Coordinator bridge disabled");
      return;
    }
    if (!this.hasRequiredConfig) {
      if (this.dryRun) {
        logger.info(
          {
            hasRewardsAddress: !!env.REWARDS_CONTRACT_ADDRESS,
            hasCoordinatorKey: !!env.COORDINATOR_PRIVATE_KEY,
            chainId: env.CHAIN_ID,
            dryRun: this.dryRun
          },
          "Coordinator bridge dry-run without contract credentials"
        );
      } else {
        logger.warn(
          {
            hasRewardsAddress: !!env.REWARDS_CONTRACT_ADDRESS,
            hasCoordinatorKey: !!env.COORDINATOR_PRIVATE_KEY,
            chainId: env.CHAIN_ID
          },
          "Coordinator bridge enabled but missing REWARDS_CONTRACT_ADDRESS or COORDINATOR_PRIVATE_KEY"
        );
        return;
      }
    }
    if (!this.rewardsContract && !this.dryRun) {
      logger.warn({ chainId: env.CHAIN_ID }, "Coordinator bridge enabled but rewards contract failed to initialize");
      return;
    }
    if (this.running) {
      return;
    }
    this.running = true;
    logger.info(
      {
        chainId: env.CHAIN_ID,
        intervalMs: env.COORDINATOR_BRIDGE_INTERVAL_MS,
        batchLimit: env.COORDINATOR_BATCH_LIMIT,
        dryRun: this.dryRun
      },
      "Coordinator bridge started"
    );

    while (this.running) {
      try {
        await this.tick();
      } catch (error) {
        logger.error({ error, chainId: env.CHAIN_ID }, "Coordinator bridge tick failed");
      }
      await sleep(env.COORDINATOR_BRIDGE_INTERVAL_MS);
    }
  }

  stop() {
    this.running = false;
  }

  private async tick() {
    const candidates = await prisma.indexedBatch.findMany({
      where: {
        chainId: env.CHAIN_ID,
        proverAddress: { not: null },
        onchainStatus: { in: SUBMITTABLE_STATUSES }
      },
      orderBy: { createdAt: "asc" },
      take: env.COORDINATOR_BATCH_LIMIT
    });

    if (candidates.length === 0) {
      logger.debug({ chainId: env.CHAIN_ID }, "No coordinator batches ready for submission");
      return;
    }

    for (const batch of candidates) {
      await this.processBatch(batch);
    }
  }

  private async processBatch(batch: IndexedBatch) {
    const attestationCount = await prisma.batchAttestation.count({
      where: {
        chainId: env.CHAIN_ID,
        batchId: batch.id,
        status: AttestationStatus.VALID
      }
    });

    if (attestationCount < env.COORDINATOR_MIN_VALID_ATTESTATIONS) {
      if (batch.onchainStatus !== OnchainSubmissionStatus.NOT_READY) {
        await prisma.indexedBatch.update({
          where: {
            chainId_id: {
              chainId: env.CHAIN_ID,
              id: batch.id
            }
          },
          data: {
            onchainStatus: OnchainSubmissionStatus.NOT_READY
          }
        });
      }
      logger.info(
        {
          batchId: batch.id,
          validAttestations: attestationCount,
          minRequired: env.COORDINATOR_MIN_VALID_ATTESTATIONS
        },
        "Skipping batch with insufficient valid attestations"
      );
      return;
    }

    if (this.dryRun) {
      logger.info(
        {
          batchId: batch.id,
          prover: batch.proverAddress,
          poiMerkleRoot: batch.poiMerkleRoot,
          sqlStatement: batch.sqlStatement,
          safeBlockNumber: batch.safeBlockNumber,
          attestationCount,
          reward: calculateReward(batch.totalTransfers, this.policy).toString()
        },
        "Coordinator dry-run: would submit PoI"
      );
      return;
    }

    const locked = await prisma.indexedBatch.updateMany({
      where: {
        chainId: env.CHAIN_ID,
        id: batch.id,
        onchainStatus: { in: SUBMITTABLE_STATUSES }
      },
      data: {
        onchainStatus: OnchainSubmissionStatus.PENDING,
        lastSubmissionAttempt: new Date()
      }
    });

    if (locked.count === 0) {
      logger.debug({ batchId: batch.id }, "Batch already claimed by another coordinator tick");
      return;
    }

    if (!batch.proverAddress) {
      await prisma.indexedBatch.update({
        where: {
          chainId_id: {
            chainId: env.CHAIN_ID,
            id: batch.id
          }
        },
        data: {
          onchainStatus: OnchainSubmissionStatus.FAILED,
          onchainError: "Missing prover address"
        }
      });
      logger.warn({ batchId: batch.id }, "Skipping batch without prover address");
      return;
    }

    const rewardAmount = calculateReward(batch.totalTransfers, this.policy);

    try {
      const tx = await this.rewardsContract!.submitProof({
        batchId: keccak256(toUtf8Bytes(batch.id)),
        indexer: batch.proverAddress,
        poiMerkleRoot: batch.poiMerkleRoot,
        sqlProofRoot: batch.sqlStatement
          ? keccak256(toUtf8Bytes(batch.sqlStatement))
          : ZeroHash,
        safeBlockNumber: BigInt(batch.safeBlockNumber),
        rewardAmount
      });

      const receipt = await tx.wait(env.COORDINATOR_TX_CONFIRMATIONS);

      await prisma.indexedBatch.update({
        where: {
          chainId_id: {
            chainId: env.CHAIN_ID,
            id: batch.id
          }
        },
        data: {
          onchainStatus: OnchainSubmissionStatus.CONFIRMED,
          onchainSubmittedAt: new Date(),
          onchainTxHash: receipt?.hash ?? tx.hash,
          rewardAmount: rewardAmount.toString(),
          onchainError: null
        }
      });

      recordOnchainSubmission("ok");
      logger.info(
        {
          batchId: batch.id,
          txHash: receipt?.hash ?? tx.hash,
          rewardAmount: rewardAmount.toString(),
          safeBlockNumber: batch.safeBlockNumber
        },
        "Submitted PoI on-chain"
      );
    } catch (error) {
      await prisma.indexedBatch.update({
        where: {
          chainId_id: {
            chainId: env.CHAIN_ID,
            id: batch.id
          }
        },
        data: {
          onchainStatus: OnchainSubmissionStatus.FAILED,
          onchainError: error instanceof Error ? error.message : String(error),
          rewardAmount: rewardAmount.toString()
        }
      });

      recordOnchainSubmission("error");
      logger.error(
        { error, batchId: batch.id, rewardAmount: rewardAmount.toString() },
        "Failed to submit PoI on-chain"
      );
    }
  }
}

export const coordinatorBridge = new CoordinatorBridge();
