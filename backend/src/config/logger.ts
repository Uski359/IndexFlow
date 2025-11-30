import pino from "pino";
import { config } from "./env.js";

// Render ortamında pretty print yok — her zaman düz JSON
export const logger = pino({
  level: config.logLevel || "info",
});
