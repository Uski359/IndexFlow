import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import { ERC20_ABI } from "./shared/abis";

function parseArgs() {
  const input = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  return {
    amount: input.amount,
  };
}

async function main() {
  const { amount } = parseArgs();
  if (!amount) {
    throw new Error("Provide amount=<tokens> to fund rewards");
  }
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const stakingAddress = contracts.stakingRewards;
  if (!stakingAddress) {
    throw new Error("Set STAKING_REWARDS address in .env");
  }
  const rewardTokenAddress = contracts.rewardToken ?? contracts.iflwToken;
  if (!rewardTokenAddress) {
    throw new Error("REWARD_TOKEN missing");
  }

  const rewardToken = new ethers.Contract(rewardTokenAddress, ERC20_ABI, wallet);
  const decimals = Number(await rewardToken.decimals());
  const parsed = ethers.parseUnits(amount, decimals);

  const stakingContract = new ethers.Contract(
    stakingAddress,
    ["function notifyRewardAmount(uint256 reward)", "function rewardsDuration() view returns (uint256)"],
    wallet
  );

  const allowance: bigint = await rewardToken.allowance(wallet.address, stakingAddress);
  if (allowance < parsed) {
    const approveTx = await rewardToken.approve(stakingAddress, parsed);
    console.log(`[12] Approving reward token -> ${approveTx.hash}`);
    await approveTx.wait();
  }

  console.log(`[12] Funding rewards with ${amount} tokens`);
  const tx = await stakingContract.notifyRewardAmount(parsed);
  console.log(`[12] notifyRewardAmount tx: ${tx.hash}`);
  await tx.wait();
  const duration: bigint = await stakingContract.rewardsDuration();
  console.log(`[12] Rewards duration (seconds): ${duration.toString()}`);
}

main().catch((error) => {
  console.error("[12] Reward funding failed:", error);
  process.exit(1);
});
