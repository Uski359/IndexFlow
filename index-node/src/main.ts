// Temporary bootstrap file; will be replaced with orchestrated server + indexer logic.
import { startServer } from "./server";
import { indexer } from "@indexer/indexer";
import { coordinatorBridge } from "@coordinator/bridge";
import { env } from "@config/env";
import { logger } from "@telemetry/logger";

async function bootstrap() {
  try {
    await startServer();
    // Run the indexer loop without awaiting to keep the process responsive.
    indexer.start().catch((error) => {
      logger.error({ error }, "Indexer terminated unexpectedly");
      process.exit(1);
    });
    if (env.COORDINATOR_ENABLED) {
      const hasCoordinatorConfig =
        !!env.REWARDS_CONTRACT_ADDRESS &&
        !!env.COORDINATOR_PRIVATE_KEY &&
        env.COORDINATOR_PRIVATE_KEY.trim() !== "";

      if (hasCoordinatorConfig) {
        logger.info("Coordinator bridge enabled");
        coordinatorBridge.start().catch((error) => {
          logger.error({ error }, "Coordinator bridge terminated unexpectedly");
        });
      } else {
        logger.warn(
          "Coordinator bridge enabled but missing REWARDS_CONTRACT_ADDRESS or COORDINATOR_PRIVATE_KEY; skipping start"
        );
      }
    } else {
      logger.info("Coordinator bridge disabled");
    }
  } catch (error) {
    logger.error({ error }, "Failed to start index node");
    process.exit(1);
  }
}

void bootstrap();
