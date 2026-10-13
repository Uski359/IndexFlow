-- CreateEnum
CREATE TYPE "OnchainSubmissionStatus" AS ENUM ('NOT_READY', 'PENDING', 'CONFIRMED', 'FAILED');

-- AlterTable
ALTER TABLE "IndexedBatch"
  ADD COLUMN "rewardAmount" TEXT,
  ADD COLUMN "onchainStatus" "OnchainSubmissionStatus" NOT NULL DEFAULT 'NOT_READY',
  ADD COLUMN "onchainTxHash" TEXT,
  ADD COLUMN "onchainSubmittedAt" TIMESTAMP(3),
  ADD COLUMN "onchainError" TEXT,
  ADD COLUMN "lastSubmissionAttempt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "IndexedBatch_chainId_onchainStatus_idx" ON "IndexedBatch"("chainId", "onchainStatus");
