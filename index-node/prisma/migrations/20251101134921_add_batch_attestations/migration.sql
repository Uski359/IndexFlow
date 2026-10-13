-- CreateEnum
CREATE TYPE "AttestationStatus" AS ENUM ('VALID', 'INVALID');

-- AlterTable
ALTER TABLE "IndexedBatch" ADD COLUMN     "proverAddress" TEXT;

-- CreateTable
CREATE TABLE "BatchAttestation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "attestor" TEXT NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "status" "AttestationStatus" NOT NULL,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchAttestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BatchAttestation_batchId_idx" ON "BatchAttestation"("batchId");

-- CreateIndex
CREATE INDEX "BatchAttestation_attestor_idx" ON "BatchAttestation"("attestor");

-- AddForeignKey
ALTER TABLE "BatchAttestation" ADD CONSTRAINT "BatchAttestation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "IndexedBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
