import type { ChainConfig } from './types';

export const ETHEREUM_MAINNET: ChainConfig = {
  id: 'ethereum',
  network: 'mainnet',
  rpcEnvKey: 'ETHEREUM_RPC',
  tokenAddress: null, // TODO: set to Ethereum mainnet token address once deployed
  deployBlock: null // TODO: set to Ethereum deployment block height
};
