export interface PolicyConfig {
  maxTxValueEth: number;
  allowedContracts: string[];
  requiredZkTlsProof: boolean;
  minReputationScore: number;
}

export interface EvaluationRequest {
  agentAddress: string;
  targetContract: string;
  calldata: string;
  txValueEth: number;
  x402Price?: number;
  zkTlsProof?: unknown;
}

export type DecisionStatus = 'ALLOW' | 'REVIEW' | 'DENY';

export interface DecisionReceipt {
  status: DecisionStatus;
  reason: string;
  riskScore: number;
  timestamp: number;
  signature?: string;
  reputationScore?: number;
}