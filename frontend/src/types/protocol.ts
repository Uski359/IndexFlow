export type DatasetStatus = 'pending' | 'indexed' | 'challenged' | 'rejected' | 'archived';

export interface DatasetMetadata {
  name: string;
  description: string;
  tags: string[];
  datasetType: 'on-chain' | 'off-chain';
  source?: string;
  sizeInMb: number;
  contractDatasetId?: number;
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

export interface DataEntry {
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

export interface VerificationTask {
  entryId: string;
  hash: string;
  submitter: string;
  qualityScore: number;
  stakeRequired: number;
  deadline: string;
  status: 'open' | 'completed' | 'disputed';
}

export interface StakePosition {
  id: string;
  amount: number;
  apy: number;
  lockUntil: string;
  rewardsToClaim: number;
  type: 'passive' | 'active';
}

export interface UserProfile {
  address: string;
  reputation: number;
  stakedIflw: number;
  earnedIflw: number;
  pendingRewards: number;
  completedVerifications: number;
  activeChallenges: number;
  stakes: StakePosition[];
}

export interface Challenge {
  id: string;
  entryId: string;
  challenger: string;
  bond: number;
  status: 'pending' | 'won' | 'lost';
  openedAt: string;
  reason?: string;
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

export interface ApiDocOperation {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  params?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  sampleResponse: Record<string, unknown>;
}
