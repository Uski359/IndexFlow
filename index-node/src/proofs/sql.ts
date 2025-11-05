import { prisma } from "@db/prisma";
import { env } from "@config/env";
import { logger } from "@telemetry/logger";

export interface ProofOfSqlResult {
  id: string;
  status: string;
  etaSeconds: number;
}

export async function requestProofOfSql(
  query: string,
  requester?: string | null
): Promise<ProofOfSqlResult> {
  const sanitizedQuery = query.trim();
  if (!sanitizedQuery) {
    throw new Error("SQL query must not be empty");
  }

  const record = await prisma.proofOfSqlAudit.create({
    data: {
      chainId: env.CHAIN_ID,
      query: sanitizedQuery,
      requester,
      status: "QUEUED"
    }
  });

  logger.info(
    {
      requestId: record.id,
      requester,
      preview: sanitizedQuery.slice(0, 80)
    },
    "Queued Proof of SQL request"
  );

  return {
    id: record.id,
    status: record.status,
    etaSeconds: 180
  };
}
