import { Prisma } from "@prisma/client";

import { env } from "@config/env";
import { prisma } from "@db/prisma";

async function main() {
  const candidates = await prisma.indexedBatch.findMany({
    where: {
      chainId: env.CHAIN_ID,
      proverAddress: { not: null },
      onchainStatus: { in: ["NOT_READY", "FAILED"] as Prisma.OnchainSubmissionStatus[] }
    },
    orderBy: { createdAt: "asc" },
    take: env.COORDINATOR_BATCH_LIMIT
  });

  if (candidates.length === 0) {
    console.log("No batches ready for submission");
    return;
  }

  console.log(`Found ${candidates.length} candidate batches:`);
  for (const batch of candidates) {
    const attestations = await prisma.batchAttestation.count({
      where: {
        chainId: env.CHAIN_ID,
        batchId: batch.id,
        status: "VALID"
      }
    });

    console.log(
      JSON.stringify(
        {
          batchId: batch.id,
          prover: batch.proverAddress,
          onchainStatus: batch.onchainStatus,
          attestations,
          poiMerkleRoot: batch.poiMerkleRoot,
          sqlStatement: batch.sqlStatement,
          safeBlockNumber: batch.safeBlockNumber
        },
        null,
        2
      )
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
