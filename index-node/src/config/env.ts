import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  RPC_URL: z.string().url().default("https://sepolia.infura.io/v3/demo"),
  CHAIN_ID: z.string().default("sepolia"),
  START_BLOCK: z.coerce.number().int().nonnegative().optional(),
  CONFIRMATIONS: z.coerce.number().int().min(0).default(6),
  BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(25),
  INDEX_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(4_000),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(100).default(10_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  OPENAI_API_KEY: z.string().optional()
});

export type AppEnv = z.infer<typeof envSchema>;

export const env: AppEnv = envSchema.parse(process.env);
