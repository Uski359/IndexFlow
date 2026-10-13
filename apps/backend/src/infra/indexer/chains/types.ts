export interface ChainConfig {
  id: string; // canonical chain identifier, e.g., "sepolia", "polygon"
  network: string; // network name, e.g., "mainnet", "sepolia"
  rpcEnvKey: string; // base env var key used to resolve RPC URLs
  tokenAddress: string | null; // ERC20 contract address to index
  deployBlock: number | null; // first block to index (token deployment)
  utility?: {
    stakingPool?: { address: string; deployBlock?: number | null };
    proofOfIndexing?: { address: string; deployBlock?: number | null };
    contributionRegistry?: { address: string; deployBlock?: number | null };
  };
}
