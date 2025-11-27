export interface ProofDTO {
  chain: string;
  operator: string;
  chainId: string;
  fromBlock: number;
  toBlock: number;
  proofHash: string;
  timestamp: number;
  block: number;
  txHash: string;
}
