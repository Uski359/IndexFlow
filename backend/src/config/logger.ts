import pino from "pino";
import { config } from "./env.js";

const isProd = config.nodeEnv === "production";

export const logger = isProd
  ? pino({
      level: config.logLevel,
    })
  : pino({
      level: config.logLevel,
      transport: {
        target: "pino-pretty",
        options: {
          translateTime: "SYS:standard",
          colorize: true,
        },
      },
    });
