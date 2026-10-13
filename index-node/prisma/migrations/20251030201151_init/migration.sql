-- CreateTable
CREATE TABLE "Block" (
    "number" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "parentHash" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("number")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "hash" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "Erc20Transfer" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Erc20Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Block_hash_key" ON "Block"("hash");

-- CreateIndex
CREATE INDEX "Transaction_blockNumber_idx" ON "Transaction"("blockNumber");

-- CreateIndex
CREATE INDEX "Erc20Transfer_blockNumber_idx" ON "Erc20Transfer"("blockNumber");

-- CreateIndex
CREATE INDEX "Erc20Transfer_token_idx" ON "Erc20Transfer"("token");

-- CreateIndex
CREATE INDEX "Erc20Transfer_from_idx" ON "Erc20Transfer"("from");

-- CreateIndex
CREATE INDEX "Erc20Transfer_to_idx" ON "Erc20Transfer"("to");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_blockNumber_fkey" FOREIGN KEY ("blockNumber") REFERENCES "Block"("number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Erc20Transfer" ADD CONSTRAINT "Erc20Transfer_txHash_fkey" FOREIGN KEY ("txHash") REFERENCES "Transaction"("hash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Erc20Transfer" ADD CONSTRAINT "Erc20Transfer_blockNumber_fkey" FOREIGN KEY ("blockNumber") REFERENCES "Block"("number") ON DELETE CASCADE ON UPDATE CASCADE;
