import { z } from 'zod';

const logLevels = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);

const indexNodeEnvSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://indexflow:indexflow@localhost:5432/indexflow'),
    RPC_URL: z.string().url().default('https://sepolia.infura.io/v3/demo'),
    CHAIN_ID: z.string().default('sepolia'),
    START_BLOCK: z.coerce.number().int().nonnegative().optional(),
    CONFIRMATIONS: z.coerce.number().int().min(0).default(6),
    BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(25),
    INDEX_POLL_INTERVAL_MS: z.coerce.number().int().min(1_000).default(4_000),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4_000),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(100).default(10_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
    LOG_LEVEL: logLevels.default('info'),
    OPENAI_API_KEY: z.string().optional()
  })
  .transform((raw) => ({
    DATABASE_URL: raw.DATABASE_URL,
    RPC_URL: raw.RPC_URL,
    CHAIN_ID: raw.CHAIN_ID,
    START_BLOCK: raw.START_BLOCK,
    CONFIRMATIONS: raw.CONFIRMATIONS,
    BATCH_SIZE: raw.BATCH_SIZE,
    INDEX_POLL_INTERVAL_MS: raw.INDEX_POLL_INTERVAL_MS,
    PORT: raw.PORT,
    RATE_LIMIT_WINDOW_MS: raw.RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX: raw.RATE_LIMIT_MAX,
    LOG_LEVEL: raw.LOG_LEVEL,
    OPENAI_API_KEY: raw.OPENAI_API_KEY
  }));

export type IndexNodeEnv = z.infer<typeof indexNodeEnvSchema>;

export const loadIndexNodeEnv = (
  source: Record<string, string | undefined> = process.env
): IndexNodeEnv => indexNodeEnvSchema.parse(source);
