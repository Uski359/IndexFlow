import type { ChainConfig } from './types.js';

export const BNB: ChainConfig = {
  id: 'bnb',
  network: 'mainnet',
  rpcEnvKey: 'BNB_RPC',
  tokenAddress: null, // TODO: set to BNB Chain token address once deployed
  deployBlock: null // TODO: set to BNB Chain deployment block height
};
