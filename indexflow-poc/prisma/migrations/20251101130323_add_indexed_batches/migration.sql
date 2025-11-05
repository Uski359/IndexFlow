-- CreateTable
CREATE TABLE "IndexedBatch" (
    "id" TEXT NOT NULL,
    "startBlock" INTEGER NOT NULL,
    "endBlock" INTEGER NOT NULL,
    "merkleRoot" TEXT NOT NULL,
    "totalBlocks" INTEGER NOT NULL,
    "totalTransactions" INTEGER NOT NULL,
    "totalTransfers" INTEGER NOT NULL,
    "proverSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndexedBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IndexedBatch_createdAt_idx" ON "IndexedBatch"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IndexedBatch_startBlock_endBlock_key" ON "IndexedBatch"("startBlock", "endBlock");
