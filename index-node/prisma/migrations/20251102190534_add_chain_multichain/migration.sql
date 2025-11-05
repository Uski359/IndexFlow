-- Generated via `prisma migrate diff`
-- Introduces multi-chain support by adding chainId columns and composite keys.

-- Drop existing foreign keys
ALTER TABLE "public"."BatchAttestation" DROP CONSTRAINT "BatchAttestation_batchId_fkey";
ALTER TABLE "public"."Erc20Transfer" DROP CONSTRAINT "Erc20Transfer_blockNumber_fkey";
ALTER TABLE "public"."Erc20Transfer" DROP CONSTRAINT "Erc20Transfer_txHash_fkey";
ALTER TABLE "public"."Transaction" DROP CONSTRAINT "Transaction_blockNumber_fkey";

-- Drop indexes that will be recreated with composite keys
DROP INDEX "public"."BatchAttestation_attestor_idx";
DROP INDEX "public"."BatchAttestation_batchId_idx";
DROP INDEX "public"."Block_hash_key";
DROP INDEX "public"."Erc20Transfer_blockNumber_idx";
DROP INDEX "public"."Erc20Transfer_from_idx";
DROP INDEX "public"."Erc20Transfer_to_idx";
DROP INDEX "public"."Erc20Transfer_token_idx";
DROP INDEX "public"."IndexedBatch_createdAt_idx";
DROP INDEX "public"."IndexedBatch_startBlock_endBlock_key";
DROP INDEX "public"."Transaction_blockNumber_idx";

-- Add chainId columns and adjust primary keys
ALTER TABLE "BatchAttestation" DROP CONSTRAINT "BatchAttestation_pkey",
    ADD COLUMN "chainId" TEXT NOT NULL DEFAULT 'sepolia',
    ADD CONSTRAINT "BatchAttestation_pkey" PRIMARY KEY ("chainId", "id");

ALTER TABLE "Block" DROP CONSTRAINT "Block_pkey",
    ADD COLUMN "chainId" TEXT NOT NULL DEFAULT 'sepolia',
    ADD CONSTRAINT "Block_pkey" PRIMARY KEY ("chainId", "number");

ALTER TABLE "Erc20Transfer" DROP CONSTRAINT "Erc20Transfer_pkey",
    ADD COLUMN "chainId" TEXT NOT NULL DEFAULT 'sepolia',
    ADD CONSTRAINT "Erc20Transfer_pkey" PRIMARY KEY ("chainId", "id");

ALTER TABLE "IndexedBatch" DROP CONSTRAINT "IndexedBatch_pkey",
    ADD COLUMN "chainId" TEXT NOT NULL DEFAULT 'sepolia',
    ADD CONSTRAINT "IndexedBatch_pkey" PRIMARY KEY ("chainId", "id");

ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_pkey",
    ADD COLUMN "chainId" TEXT NOT NULL DEFAULT 'sepolia',
    ADD CONSTRAINT "Transaction_pkey" PRIMARY KEY ("chainId", "hash");

-- Recreate indexes with chain scoping
CREATE INDEX "BatchAttestation_chainId_batchId_idx" ON "BatchAttestation"("chainId", "batchId");
CREATE INDEX "BatchAttestation_chainId_attestor_idx" ON "BatchAttestation"("chainId", "attestor");

CREATE INDEX "Block_chainId_createdAt_idx" ON "Block"("chainId", "createdAt");
CREATE UNIQUE INDEX "Block_chainId_hash_key" ON "Block"("chainId", "hash");

CREATE INDEX "Erc20Transfer_chainId_blockNumber_idx" ON "Erc20Transfer"("chainId", "blockNumber");
CREATE INDEX "Erc20Transfer_chainId_txHash_idx" ON "Erc20Transfer"("chainId", "txHash");
CREATE INDEX "Erc20Transfer_chainId_token_idx" ON "Erc20Transfer"("chainId", "token");
CREATE INDEX "Erc20Transfer_chainId_from_idx" ON "Erc20Transfer"("chainId", "from");
CREATE INDEX "Erc20Transfer_chainId_to_idx" ON "Erc20Transfer"("chainId", "to");

CREATE INDEX "IndexedBatch_chainId_createdAt_idx" ON "IndexedBatch"("chainId", "createdAt");
CREATE UNIQUE INDEX "IndexedBatch_chainId_startBlock_endBlock_key" ON "IndexedBatch"("chainId", "startBlock", "endBlock");

CREATE INDEX "Transaction_chainId_blockNumber_idx" ON "Transaction"("chainId", "blockNumber");

-- Reinstate foreign keys with composite references
ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_chainId_blockNumber_fkey"
    FOREIGN KEY ("chainId", "blockNumber") REFERENCES "Block"("chainId", "number")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Erc20Transfer"
    ADD CONSTRAINT "Erc20Transfer_chainId_txHash_fkey"
    FOREIGN KEY ("chainId", "txHash") REFERENCES "Transaction"("chainId", "hash")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Erc20Transfer"
    ADD CONSTRAINT "Erc20Transfer_chainId_blockNumber_fkey"
    FOREIGN KEY ("chainId", "blockNumber") REFERENCES "Block"("chainId", "number")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchAttestation"
    ADD CONSTRAINT "BatchAttestation_chainId_batchId_fkey"
    FOREIGN KEY ("chainId", "batchId") REFERENCES "IndexedBatch"("chainId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE;
