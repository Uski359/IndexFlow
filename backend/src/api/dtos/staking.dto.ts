export interface StakingUserDTO {
  totalStaked: string;
  totalUnstaked: string;
  netStaked: string;
  totalRewardsClaimed: string;
}

export interface GlobalStakingStatsDTO {
  totalStakers: number;
  totalStaked: string;
  totalRewardsDistributed: string;
  netStaked: string;
}
