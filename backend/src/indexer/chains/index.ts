import type { ChainConfig } from './types.js';
import { SEPOLIA } from './sepolia.js';
import { POLYGON } from './polygon.js';
import { ARBITRUM } from './arbitrum.js';
import { BASE } from './base.js';
import { OPTIMISM } from './optimism.js';

export const CHAINS: Record<string, ChainConfig> = {
  sepolia: SEPOLIA,
  polygon: POLYGON,
  arbitrum: ARBITRUM,
  base: BASE,
  optimism: OPTIMISM
};

export const getChainConfig = (chainId: string): ChainConfig => {
  const chain = CHAINS[chainId];

  if (!chain) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  return chain;
};
