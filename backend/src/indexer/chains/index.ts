import type { ChainConfig } from './types.ts';
import { SEPOLIA } from './sepolia.ts';
import { POLYGON } from './polygon.ts';
import { ARBITRUM } from './arbitrum.ts';
import { BASE } from './base.ts';
import { OPTIMISM } from './optimism.ts';

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
