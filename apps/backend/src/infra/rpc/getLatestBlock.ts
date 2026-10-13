import { JsonRpcProvider } from 'ethers';
import createHttpError from 'http-errors';

const CHAIN_RPC_ENV_KEYS: Record<number, string[]> = {
  1: ['RPC_URL_MAINNET', 'ETHEREUM_RPC', 'ETHEREUM_RPC_1', 'RPC_URL'],
  10: ['RPC_URL_OPTIMISM', 'OPTIMISM_RPC', 'OPTIMISM_RPC_1'],
  56: ['RPC_URL_BNB', 'BNB_RPC', 'BNB_RPC_1'],
  137: ['RPC_URL_POLYGON', 'POLYGON_RPC', 'POLYGON_RPC_1'],
  42161: ['RPC_URL_ARBITRUM', 'ARBITRUM_RPC', 'ARBITRUM_RPC_1'],
  8453: ['RPC_URL_BASE', 'BASE_RPC', 'BASE_RPC_1'],
  11155111: ['RPC_URL_SEPOLIA', 'SEPOLIA_RPC', 'SEPOLIA_RPC_1']
};

const providerCache = new Map<string, JsonRpcProvider>();

export const resolveRpcEnvKeys = (chain_id: number) => CHAIN_RPC_ENV_KEYS[chain_id] ?? [];

export const resolveRpcEnvKey = (chain_id: number) => resolveRpcEnvKeys(chain_id)[0];

export const resolveRpcUrl = (chain_id: number) => {
  const envKeys = resolveRpcEnvKeys(chain_id);
  for (const envKey of envKeys) {
    const value = process.env[envKey]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
};

const getProvider = (rpcUrl: string) => {
  let provider = providerCache.get(rpcUrl);
  if (!provider) {
    provider = new JsonRpcProvider(rpcUrl);
    providerCache.set(rpcUrl, provider);
  }
  return provider;
};

export const getLatestBlock = async (chain_id: number): Promise<number> => {
  const rpcUrl = resolveRpcUrl(chain_id);
  if (!rpcUrl) {
    throw createHttpError(503, 'rpc_missing');
  }

  const provider = getProvider(rpcUrl);
  return provider.getBlockNumber();
};
