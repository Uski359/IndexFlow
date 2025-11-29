import type { ChainConfig } from './types';

export const SEPOLIA: ChainConfig = {
  id: 'sepolia',
  network: 'sepolia',
  rpcEnvKey: 'SEPOLIA_RPC',
  tokenAddress: '0x93b95f6956330f4a56e7a94457a7e597a7340e61',
  deployBlock: 9_706_805, // IndexFlow token deployment block on Sepolia
  utility: {
    stakingPool: process.env.SEPOLIA_STAKING_POOL
      ? {
          address: process.env.SEPOLIA_STAKING_POOL,
          deployBlock: process.env.SEPOLIA_STAKING_DEPLOY_BLOCK
            ? Number(process.env.SEPOLIA_STAKING_DEPLOY_BLOCK)
            : 9_706_805
        }
      : undefined,
    proofOfIndexing: process.env.SEPOLIA_POI
      ? {
          address: process.env.SEPOLIA_POI,
          deployBlock: process.env.SEPOLIA_POI_DEPLOY_BLOCK
            ? Number(process.env.SEPOLIA_POI_DEPLOY_BLOCK)
            : 9_706_805
        }
      : undefined,
    contributionRegistry: process.env.SEPOLIA_CONTRIBUTIONS
      ? {
          address: process.env.SEPOLIA_CONTRIBUTIONS,
          deployBlock: process.env.SEPOLIA_CONTRIBUTIONS_DEPLOY_BLOCK
            ? Number(process.env.SEPOLIA_CONTRIBUTIONS_DEPLOY_BLOCK)
            : 9_706_805
        }
      : undefined
  }
};
