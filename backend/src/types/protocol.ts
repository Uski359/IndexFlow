export type DatasetStatus = 'pending' | 'indexed' | 'challenged' | 'rejected';

export interface DatasetMetadata {
  name: string;
  description: string;
  tags: string[];
  datasetType: 'on-chain' | 'off-chain';
  source?: string;
  sizeInMb: number;
}

export interface Dataset {
  id: string;
  hash: string;
  sqlHash?: string | null;
  metadata: DatasetMetadata;
  status: DatasetStatus;
  reward: number;
  qualityScore: number;
  reputationMultiplier: number;
  stakeBoost: number;
  updatedAt: string;
  submitter: string;
  validatorSummary?: ValidatorSummary | null;
  validatedAt?: string | null;
}

export interface ValidatorSummary {
  valid: boolean;
  datasetHash: string;
  sqlHash?: string;
  poiHash?: string;
  issues: string[];
  inferredSchema: Record<string, string>;
  rowCount: number;
}

export interface VerificationResult {
  entryId: string;
  verifier: string;
  verdict: 'approved' | 'rejected';
  qualityScore: number;
  notes?: string;
  processedAt: string;
}

export interface StakeRequest {
  address: string;
  amount: number;
  stakeType: 'passive' | 'active';
  lockDays: number;
}

export interface StakePosition {
  id: string;
  address: string;
  amount: number;
  apy: number;
  lockUntil: string;
  type: 'passive' | 'active';
  rewardsToClaim: number;
}

export interface RewardSummary {
  address: string;
  pending: number;
  lifetime: number;
  latestDistributions: Array<{
    datasetId: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface Challenge {
  id: string;
  entryId: string;
  challenger: string;
  reason: string;
  bond: number;
  status: 'pending' | 'won' | 'lost';
  openedAt: string;
}

export interface RewardEvent {
  id: string;
  datasetId: string;
  recipient: string;
  amount: number;
  createdAt: string;
}

export interface AdminSettings {
  baseReward: number;
  challengeBond: number;
  validatorQuorum: number;
  slashPercentage: number;
  oracleUrl: string;
  updatedAt: string;
}

export interface ProofGenerationPayload {
  datasetId: string;
  validator: string;
  metadata: DatasetMetadata;
  expectedSchema?: Record<string, string>;
  records?: Array<Record<string, unknown>>;
  csvPayload?: string;
  sqlQuery?: string;
  chainId?: number;
  blockNumber?: number;
}

export interface ProofGenerationResult {
  datasetId: string;
  validator: string;
  datasetHash: string;
  poiHash: string;
  sqlHash?: string | null;
  rowCount: number;
  warnings: string[];
  generatedAt: string;
}

export type ProofJobStatus = 'queued' | 'processing' | 'submitted' | 'failed';

export interface ProofSubmissionRequestBody {
  datasetId: string;
  validator: string;
  poiHash: string;
  sqlHash?: string;
  targetBlock?: number;
  chainId?: number;
  notes?: string;
}

export interface ProofSubmissionJob {
  jobId: string;
  datasetId: string;
  validator: string;
  poiHash: string;
  sqlHash?: string | null;
  status: ProofJobStatus;
  queuedAt: string;
  targetBlock?: number | null;
  chainId?: number | null;
  notes?: string | null;
  txHash?: string | null;
  error?: string | null;
  retries?: number;
  lastAttempt?: string | null;
}

export interface ProofJobUpdate {
  status: ProofJobStatus;
  txHash?: string;
  error?: string;
}
