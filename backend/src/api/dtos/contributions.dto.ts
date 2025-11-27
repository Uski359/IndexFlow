export interface ContributionDTO {
  chain: string;
  user: string;
  contributionType: string;
  weight: string;
  timestamp: number;
  txHash: string;
  block: number;
}

export interface ContributionLeaderboardEntry {
  user: string;
  totalWeight: string;
}
