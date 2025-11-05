import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { env } from "@config/env";
import { schema } from "@graphql/schema";
import { prisma } from "@db/prisma";
import { logger } from "@telemetry/logger";
import { requestProofOfSql } from "@proofs/sql";
import { RateLimiterMemory } from "rate-limiter-flexible";

const rateLimiter = new RateLimiterMemory({
  points: env.RATE_LIMIT_MAX,
  duration: env.RATE_LIMIT_WINDOW_MS / 1000
});

const rateLimiterMiddleware: express.RequestHandler = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip ?? "anonymous");
    next();
  } catch {
    res.status(429).json({ error: "Too many requests" });
  }
};

export async function startServer() {
  const server = new ApolloServer({
    schema,
    formatError(formattedError) {
      logger.warn({ error: formattedError }, "GraphQL error");
      return formattedError;
    }
  });

  await server.start();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(rateLimiterMiddleware);
  app.use(bodyParser.json({ limit: "1mb" }));

  app.get("/health", async (_req, res) => {
    try {
      const checkpoint = await prisma.indexerCheckpoint.findUnique({
        where: { chainId: env.CHAIN_ID }
      });
      const latestBatch = await prisma.indexedBatch.findFirst({
        where: { chainId: env.CHAIN_ID },
        orderBy: { createdAt: "desc" },
        select: { id: true, endBlock: true, totalTransactions: true }
      });

      res.json({
        status: "healthy",
        chainId: env.CHAIN_ID,
        checkpoint,
        latestBatch
      });
    } catch (error) {
      logger.error({ error }, "Health check failed");
      res.status(500).json({ status: "degraded" });
    }
  });

  app.post("/proof/sql", async (req, res) => {
    try {
      if (!req.body || typeof req.body.query !== "string") {
        res.status(400).json({ error: "Missing SQL query in body" });
        return;
      }
      const response = await requestProofOfSql(req.body.query, req.body.requester);
      res.status(202).json({
        requestId: response.id,
        status: response.status,
        etaSeconds: response.etaSeconds,
        message: "Proof of SQL request accepted (placeholder)"
      });
    } catch (error) {
      logger.error({ error }, "Proof of SQL endpoint error");
      res.status(500).json({ error: "Unable to queue Proof of SQL request" });
    }
  });

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: async () => ({
        prisma,
        chainId: env.CHAIN_ID
      })
    })
  );

  return new Promise<void>((resolve) => {
    const port = env.PORT;
    app.listen(port, () => {
      logger.info({ port }, "IndexFlow GraphQL server ready");
      resolve();
    });
  });
}
