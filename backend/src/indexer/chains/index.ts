import type { ChainConfig } from './types';
import { SEPOLIA } from './sepolia';
import { POLYGON } from './polygon';
import { ARBITRUM } from './arbitrum';
import { BASE } from './base';
import { OPTIMISM } from './optimism';

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
