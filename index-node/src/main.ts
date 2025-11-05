// Temporary bootstrap file; will be replaced with orchestrated server + indexer logic.
import { startServer } from "./server";
import { indexer } from "@indexer/indexer";
import { logger } from "@telemetry/logger";

async function bootstrap() {
  try {
    await startServer();
    // Run the indexer loop without awaiting to keep the process responsive.
    indexer.start().catch((error) => {
      logger.error({ error }, "Indexer terminated unexpectedly");
      process.exit(1);
    });
  } catch (error) {
    logger.error({ error }, "Failed to start index node");
    process.exit(1);
  }
}

void bootstrap();
