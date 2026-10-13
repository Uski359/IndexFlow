import { z } from 'zod';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const logLevels = z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']);
const nodeEnvs = z.enum(['development', 'test', 'production']);
const hexAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/u, 'Expected 0x-prefixed address');

const normalizeAddress = (value: string) => value.toLowerCase();

const parseAddressList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0 && item.startsWith('0x'));

const backendConfigSchema = z
  .object({
    NODE_ENV: nodeEnvs.default('development'),
    LOG_LEVEL: logLevels.optional(),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4_000),
    DATABASE_URL: z
      .string()
      .url()
      .default('postgres://postgres:postgres@localhost:5432/indexflow'),
    ELASTIC_NODE: z.string().url().default('http://localhost:9200'),
    ELASTIC_API_KEY: z.string().optional(),
    JWT_SECRET: z.string().min(1).default('dev-secret'),
    JWT_EXPIRY_SECONDS: z.coerce.number().int().positive().default(60 * 60),
    JWT_ISSUER: z.string().default('indexflow'),
    REQUEST_LOGGING: z.string().optional(),
    CHAIN_RPC_URL: z
      .string()
      .url()
      .default('https://eth-sepolia.g.alchemy.com/v2/vtMDks-q4F59s_mGE9HGg'),
    CHAIN_ID: z.coerce.number().int().nonnegative().default(11_155_111),
    STAKE_TOKEN_ADDRESS: hexAddress,
    REWARD_TOKEN_ADDRESS: hexAddress,
    STAKE_CONTRACT_ADDRESS: hexAddress,
    ADMIN_WALLET_ADDRESSES: z.string().optional(),
    INDEXFLOW_TOKEN_ADDRESS: hexAddress.default(ZERO_ADDRESS),
    INDEXFLOW_DATA_ADDRESS: hexAddress.default(ZERO_ADDRESS),
    INDEXFLOW_DAO_ADDRESS: hexAddress.default(ZERO_ADDRESS),
    DATA_VALIDATOR_URL: z.string().url().default('http://localhost:7000'),
    DATA_VALIDATOR_API_KEY: z.string().optional()
  })
  .transform((raw) => ({
    nodeEnv: raw.NODE_ENV,
    logLevel: raw.LOG_LEVEL ?? (raw.NODE_ENV === 'production' ? 'info' : 'debug'),
    port: raw.PORT,
    postgresUrl: raw.DATABASE_URL,
    elasticNode: raw.ELASTIC_NODE,
    elasticApiKey: raw.ELASTIC_API_KEY,
    jwtSecret: raw.JWT_SECRET,
    jwtExpirySeconds: raw.JWT_EXPIRY_SECONDS,
    jwtIssuer: raw.JWT_ISSUER,
    enableRequestLogging: (raw.REQUEST_LOGGING ?? '').toLowerCase() !== 'false',
    chainRpcUrl: raw.CHAIN_RPC_URL,
    chainId: raw.CHAIN_ID,
    stakeTokenAddress: normalizeAddress(raw.STAKE_TOKEN_ADDRESS),
    rewardTokenAddress: normalizeAddress(raw.REWARD_TOKEN_ADDRESS),
    stakeContractAddress: normalizeAddress(raw.STAKE_CONTRACT_ADDRESS),
    adminWalletAddresses: parseAddressList(raw.ADMIN_WALLET_ADDRESSES),
    indexFlowTokenAddress: normalizeAddress(raw.INDEXFLOW_TOKEN_ADDRESS),
    indexFlowDataAddress: normalizeAddress(raw.INDEXFLOW_DATA_ADDRESS),
    indexFlowDaoAddress: normalizeAddress(raw.INDEXFLOW_DAO_ADDRESS),
    dataValidatorUrl: raw.DATA_VALIDATOR_URL,
    dataValidatorApiKey: raw.DATA_VALIDATOR_API_KEY ?? undefined
  }));

export type BackendConfig = z.infer<typeof backendConfigSchema>;

export const loadBackendConfig = (
  source: Record<string, string | undefined> = process.env
): BackendConfig => backendConfigSchema.parse(source);
