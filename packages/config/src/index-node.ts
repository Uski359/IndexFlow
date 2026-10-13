import { z } from 'zod';

const logLevels = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
const boolLike = z
  .union([z.boolean(), z.string()])
  .transform((value) => {
    if (typeof value === 'boolean') {
      return value;
    }
    const normalized = value.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  });

const addressRegex = /^0x[a-fA-F0-9]{40}$/;
const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;

const addressSchema = z.string().regex(addressRegex, 'Expected 0x-prefixed address');
const addressWithDefault = (defaultValue: string) =>
  z
    .string()
    .optional()
    .transform((val) => {
      if (!val) {
        return defaultValue;
      }
      const trimmed = val.trim();
      if (!addressRegex.test(trimmed)) {
        return defaultValue;
      }
      return trimmed;
    });
const optionalAddress = addressSchema.optional();

const indexNodeEnvSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .default('postgresql://indexflow:indexflow@localhost:5432/indexflow'),
    RPC_URL: z.string().url().default('https://eth-sepolia.g.alchemy.com/v2/vtMDks-q4F59s_mGE9HGg'),
    RPC_URLS: z.string().optional(),
    CHAIN_ID: z.string().default('sepolia'),
    START_BLOCK: z.coerce.number().int().nonnegative().optional(),
    CONFIRMATIONS: z.coerce.number().int().min(0).default(6),
    BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(25),
    INDEX_POLL_INTERVAL_MS: z.coerce.number().int().min(1_000).default(4_000),
    HEALTH_LOG_INTERVAL_MS: z.coerce.number().int().min(1_000).default(15_000),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4_000),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(100).default(10_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
    LOG_LEVEL: logLevels.default('info'),
    OPENAI_API_KEY: z.string().optional(),
    COORDINATOR_ENABLED: boolLike.default(false),
    REWARDS_CONTRACT_ADDRESS: optionalAddress,
    COORDINATOR_PRIVATE_KEY: z
      .string()
      .regex(privateKeyRegex, 'Expected 0x-prefixed private key')
      .optional(),
    COORDINATOR_BRIDGE_INTERVAL_MS: z.coerce.number().int().min(1_000).default(30_000),
    COORDINATOR_MIN_VALID_ATTESTATIONS: z.coerce.number().int().min(1).default(1),
    COORDINATOR_BATCH_LIMIT: z.coerce.number().int().min(1).max(25).default(5),
    COORDINATOR_TX_CONFIRMATIONS: z.coerce.number().int().min(0).default(1),
    COORDINATOR_DRY_RUN: boolLike.default(false),
    COORDINATOR_REWARD_TOKEN_DECIMALS: z.coerce.number().int().min(0).max(36).default(18),
    COORDINATOR_BASE_REWARD: z.string().default('0'),
    COORDINATOR_REWARD_PER_TRANSFER: z.string().default('0'),
    COORDINATOR_REWARD_CAP: z.string().optional(),
    MOCK_PROVER_ADDRESS: addressWithDefault('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'),
    MOCK_ATTESTOR_ADDRESS: addressWithDefault('0x70997970c51812dc3a010c7d01b50e0d7dca7d'),
    RPC_COOLDOWN_MS: z.coerce.number().int().min(1_000).default(60_000)
  })
  .transform((raw) => {
    const rpcUrls =
      raw.RPC_URLS && raw.RPC_URLS.trim().length > 0
        ? raw.RPC_URLS.split(',')
            .map((url) => url.trim())
            .filter((url) => url.length > 0)
        : [raw.RPC_URL];
    const primaryRpcUrl = rpcUrls[0];

    return {
      RPC_URLS: rpcUrls,
      PRIMARY_RPC_URL: primaryRpcUrl,
      DATABASE_URL: raw.DATABASE_URL,
      RPC_URL: primaryRpcUrl,
      CHAIN_ID: raw.CHAIN_ID,
      START_BLOCK: raw.START_BLOCK,
      CONFIRMATIONS: raw.CONFIRMATIONS,
      BATCH_SIZE: raw.BATCH_SIZE,
      INDEX_POLL_INTERVAL_MS: raw.INDEX_POLL_INTERVAL_MS,
      HEALTH_LOG_INTERVAL_MS: raw.HEALTH_LOG_INTERVAL_MS,
      PORT: raw.PORT,
      RATE_LIMIT_WINDOW_MS: raw.RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX: raw.RATE_LIMIT_MAX,
      LOG_LEVEL: raw.LOG_LEVEL,
      OPENAI_API_KEY: raw.OPENAI_API_KEY,
      COORDINATOR_ENABLED: raw.COORDINATOR_ENABLED,
      REWARDS_CONTRACT_ADDRESS: raw.REWARDS_CONTRACT_ADDRESS,
      COORDINATOR_PRIVATE_KEY: raw.COORDINATOR_PRIVATE_KEY,
      COORDINATOR_BRIDGE_INTERVAL_MS: raw.COORDINATOR_BRIDGE_INTERVAL_MS,
      COORDINATOR_MIN_VALID_ATTESTATIONS: raw.COORDINATOR_MIN_VALID_ATTESTATIONS,
      COORDINATOR_BATCH_LIMIT: raw.COORDINATOR_BATCH_LIMIT,
      COORDINATOR_TX_CONFIRMATIONS: raw.COORDINATOR_TX_CONFIRMATIONS,
      COORDINATOR_DRY_RUN: raw.COORDINATOR_DRY_RUN,
      COORDINATOR_REWARD_TOKEN_DECIMALS: raw.COORDINATOR_REWARD_TOKEN_DECIMALS,
      COORDINATOR_BASE_REWARD: raw.COORDINATOR_BASE_REWARD,
      COORDINATOR_REWARD_PER_TRANSFER: raw.COORDINATOR_REWARD_PER_TRANSFER,
      COORDINATOR_REWARD_CAP: raw.COORDINATOR_REWARD_CAP,
      MOCK_PROVER_ADDRESS: raw.MOCK_PROVER_ADDRESS,
      MOCK_ATTESTOR_ADDRESS: raw.MOCK_ATTESTOR_ADDRESS,
      RPC_COOLDOWN_MS: raw.RPC_COOLDOWN_MS
    };
  });

export type IndexNodeEnv = z.infer<typeof indexNodeEnvSchema>;

export const loadIndexNodeEnv = (
  source: Record<string, string | undefined> = process.env
): IndexNodeEnv => indexNodeEnvSchema.parse(source);
