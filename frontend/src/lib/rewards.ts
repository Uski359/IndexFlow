interface RewardInput {
  datasetType: 'on-chain' | 'off-chain';
  sizeInMb: number;
  qualityScore: number; // 0 - 100
  reputationScore: number; // 0 - 100
  stakeAmount: number; // IFLW
}

export function estimateReward(input: RewardInput): number {
  const baseReward = input.datasetType === 'on-chain' ? 240 : 180;
  const sizeFactor = Math.min(Math.log10(Math.max(input.sizeInMb, 1)) + 1, 3);
  const qualityMultiplier = 0.75 + input.qualityScore / 100;
  const reputationMultiplier = 0.75 + input.reputationScore / 100;
  const stakeBoost = 1 + Math.min(input.stakeAmount / 10000, 0.35);

  return Math.round(baseReward * sizeFactor * qualityMultiplier * reputationMultiplier * stakeBoost);
}
