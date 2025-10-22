import dotenv from 'dotenv';

dotenv.config();

const required = (value: string | undefined, fallback?: string) => {
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error('Missing required environment variable');
};

const number = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const parseAddressList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  logLevel:
    process.env.LOG_LEVEL ??
    ((process.env.NODE_ENV ?? 'development') === 'production' ? 'info' : 'debug'),
  port: number(process.env.PORT, 4000),
  postgresUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/indexflow',
  elasticNode: process.env.ELASTIC_NODE ?? 'http://localhost:9200',
  elasticApiKey: process.env.ELASTIC_API_KEY,
  jwtSecret: required(process.env.JWT_SECRET, 'dev-secret'),
  jwtExpirySeconds: number(process.env.JWT_EXPIRY_SECONDS, 60 * 60),
  jwtIssuer: process.env.JWT_ISSUER ?? 'indexflow',
  enableRequestLogging: process.env.REQUEST_LOGGING !== 'false',
  chainRpcUrl: required(process.env.CHAIN_RPC_URL, 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID'),
  chainId: number(process.env.CHAIN_ID, 11155111),
  stakeTokenAddress: required(process.env.STAKE_TOKEN_ADDRESS),
  rewardTokenAddress: required(process.env.REWARD_TOKEN_ADDRESS),
  stakeContractAddress: required(process.env.STAKE_CONTRACT_ADDRESS),
  adminWalletAddresses: parseAddressList(process.env.ADMIN_WALLET_ADDRESSES),
  indexFlowTokenAddress:
    process.env.INDEXFLOW_TOKEN_ADDRESS ?? '0x0000000000000000000000000000000000000000',
  indexFlowDataAddress:
    process.env.INDEXFLOW_DATA_ADDRESS ?? '0x0000000000000000000000000000000000000000',
  indexFlowDaoAddress:
    process.env.INDEXFLOW_DAO_ADDRESS ?? '0x0000000000000000000000000000000000000000',
  dataValidatorUrl: process.env.DATA_VALIDATOR_URL ?? 'http://localhost:7000',
  dataValidatorApiKey: process.env.DATA_VALIDATOR_API_KEY
};
