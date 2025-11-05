ALTER TABLE "IndexedBatch" RENAME COLUMN "merkleRoot" TO "poiMerkleRoot";

ALTER TABLE "IndexedBatch"
  ADD COLUMN "poiLeafCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "safeBlockNumber" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sqlStatement" TEXT;

ALTER TABLE "IndexedBatch" ALTER COLUMN "poiLeafCount" DROP DEFAULT;
ALTER TABLE "IndexedBatch" ALTER COLUMN "safeBlockNumber" DROP DEFAULT;

CREATE TABLE "IndexerCheckpoint" (
  "chainId" TEXT PRIMARY KEY,
  "lastIndexedBlock" INTEGER NOT NULL,
  "lastIndexedHash" TEXT,
  "safeBlockNumber" INTEGER NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ProofOfSqlAudit" (
  "id" TEXT PRIMARY KEY,
  "chainId" TEXT NOT NULL DEFAULT 'sepolia',
  "query" TEXT NOT NULL,
  "requester" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
