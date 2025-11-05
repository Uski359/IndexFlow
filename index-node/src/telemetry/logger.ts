import pino from "pino";
import { env } from "@config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.LOG_LEVEL === "debug" || env.LOG_LEVEL === "trace"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true
        }
      }
    : undefined,
  base: {
    app: "indexflow-index-node",
    chainId: env.CHAIN_ID
  }
});
