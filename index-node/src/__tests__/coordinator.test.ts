import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OnchainSubmissionStatus } from "@prisma/client";

import { CoordinatorBridge } from "@coordinator/bridge";
import { env } from "@config/env";
import { prisma } from "@db/prisma";

describe("Coordinator bridge submission flow", () => {
  const original = {
    findMany: prisma.indexedBatch.findMany,
    updateMany: prisma.indexedBatch.updateMany,
    update: prisma.indexedBatch.update,
    count: prisma.batchAttestation.count
  };

  const originalEnv = {
    coordinatorEnabled: env.COORDINATOR_ENABLED,
    privateKey: env.COORDINATOR_PRIVATE_KEY,
    rewardsAddress: env.REWARDS_CONTRACT_ADDRESS,
    dryRun: env.COORDINATOR_DRY_RUN
  };

  beforeEach(() => {
    // Avoid constructing real signer/contract during tests
    (env as any).COORDINATOR_ENABLED = false;
    (env as any).COORDINATOR_PRIVATE_KEY = "";
    (env as any).REWARDS_CONTRACT_ADDRESS = "";
    (env as any).COORDINATOR_DRY_RUN = false;
  });

  afterEach(() => {
    prisma.indexedBatch.findMany = original.findMany;
    prisma.indexedBatch.updateMany = original.updateMany;
    prisma.indexedBatch.update = original.update;
    prisma.batchAttestation.count = original.count;

    (env as any).COORDINATOR_ENABLED = originalEnv.coordinatorEnabled;
    (env as any).COORDINATOR_PRIVATE_KEY = originalEnv.privateKey;
    (env as any).REWARDS_CONTRACT_ADDRESS = originalEnv.rewardsAddress;
    (env as any).COORDINATOR_DRY_RUN = originalEnv.dryRun;
  });

  it("submits a batch when attestation and prover exist", async () => {
    const bridge = new CoordinatorBridge();

    const submitProofMock = vi.fn().mockResolvedValue({
      hash: "0xproof",
      wait: vi.fn().mockResolvedValue({ hash: "0xreceipt" })
    });

    // Inject mock contract
    (bridge as any).rewardsContract = {
      submitProof: submitProofMock
    };

    const batch = {
      chainId: env.CHAIN_ID,
      id: "batch-mock",
      proverAddress: "0xprover",
      poiMerkleRoot: "0xpoi",
      sqlStatement: "SELECT 1",
      safeBlockNumber: 123,
      totalTransfers: 10,
      onchainStatus: OnchainSubmissionStatus.NOT_READY
    };

    prisma.indexedBatch.findMany = vi.fn().mockResolvedValue([batch] as any);
    prisma.batchAttestation.count = vi.fn().mockResolvedValue(1 as any);
    prisma.indexedBatch.updateMany = vi.fn().mockResolvedValue({ count: 1 } as any);
    prisma.indexedBatch.update = vi.fn().mockResolvedValue(batch as any);

    await (bridge as any).tick();

    expect(submitProofMock).toHaveBeenCalledTimes(1);
    expect(prisma.indexedBatch.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onchainStatus: OnchainSubmissionStatus.PENDING
        })
      })
    );
    expect(prisma.indexedBatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          onchainStatus: OnchainSubmissionStatus.CONFIRMED,
          onchainTxHash: "0xreceipt"
        })
      })
    );
  });

  it("logs and skips submission when dry-run is enabled", async () => {
    (env as any).COORDINATOR_DRY_RUN = true;
    const bridge = new CoordinatorBridge();

    const submitProofMock = vi.fn();
    (bridge as any).rewardsContract = {
      submitProof: submitProofMock
    };

    const batch = {
      chainId: env.CHAIN_ID,
      id: "batch-mock",
      proverAddress: "0xprover",
      poiMerkleRoot: "0xpoi",
      sqlStatement: "SELECT 1",
      safeBlockNumber: 123,
      totalTransfers: 10,
      onchainStatus: OnchainSubmissionStatus.NOT_READY
    };

    prisma.indexedBatch.findMany = vi.fn().mockResolvedValue([batch] as any);
    prisma.batchAttestation.count = vi.fn().mockResolvedValue(1 as any);

    prisma.indexedBatch.updateMany = vi.fn();
    prisma.indexedBatch.update = vi.fn();

    await (bridge as any).tick();

    expect(submitProofMock).not.toHaveBeenCalled();
    expect(prisma.indexedBatch.updateMany).not.toHaveBeenCalled();
    expect(prisma.indexedBatch.update).not.toHaveBeenCalled();
  });
});
