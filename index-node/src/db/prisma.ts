import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@telemetry/logger";

export const prisma = new PrismaClient({
  log: [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" }
  ]
});

prisma.$on("error", (event) => {
  logger.error({ event }, "Prisma error");
});

prisma.$on("warn", (event) => {
  logger.warn({ event }, "Prisma warning");
});

export async function withTransaction<T>(cb: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(cb);
}
