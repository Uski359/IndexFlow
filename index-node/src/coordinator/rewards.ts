import { parseUnits } from "ethers";
import { env } from "@config/env";

export interface RewardPolicy {
  base: bigint;
  perTransfer: bigint;
  cap?: bigint;
}

export function buildRewardPolicy(): RewardPolicy {
  const decimals = env.COORDINATOR_REWARD_TOKEN_DECIMALS;

  const base = parseUnits(env.COORDINATOR_BASE_REWARD ?? "0", decimals);
  const perTransfer = parseUnits(env.COORDINATOR_REWARD_PER_TRANSFER ?? "0", decimals);
  const cap = env.COORDINATOR_REWARD_CAP
    ? parseUnits(env.COORDINATOR_REWARD_CAP, decimals)
    : undefined;

  return {
    base,
    perTransfer,
    cap
  };
}

export function calculateReward(totalTransfers: number, policy: RewardPolicy): bigint {
  if (totalTransfers < 0) {
    throw new Error("totalTransfers must be non-negative");
  }

  const variableComponent = policy.perTransfer * BigInt(totalTransfers);
  const reward = policy.base + variableComponent;

  if (policy.cap !== undefined && reward > policy.cap) {
    return policy.cap;
  }

  return reward;
}
