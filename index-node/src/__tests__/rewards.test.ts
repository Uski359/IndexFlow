import { describe, it, expect } from "vitest";
import { calculateReward, type RewardPolicy } from "@coordinator/rewards";

const policy: RewardPolicy = {
  base: 1000n,
  perTransfer: 50n,
  cap: 10_000n
};

describe("Reward calculator", () => {
  it("adds base reward plus per-transfer component", () => {
    const reward = calculateReward(10, policy);
    expect(reward).toBe(1000n + 50n * 10n);
  });

  it("caps the reward when it exceeds the threshold", () => {
    const reward = calculateReward(1_000_000, policy);
    expect(reward).toBe(policy.cap);
  });
});
