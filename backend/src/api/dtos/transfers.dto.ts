export interface TransferDTO {
  chain: string;
  blockNumber: number;
  txHash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number | null;
}
