import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import { ERC20_ABI } from "./shared/abis";

async function main() {
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const stakingAddress = contracts.stakingRewards;
  if (!stakingAddress) {
    throw new Error("STAKING_REWARDS not set. Deploy staking contract first.");
  }
  const rewardTokenAddress = contracts.rewardToken ?? contracts.iflwToken;
  if (!rewardTokenAddress) {
    throw new Error("REWARD_TOKEN (or IFLW_TOKEN) must be configured");
  }

  const stakingContract = new ethers.Contract(
    stakingAddress,
    ["function getReward()", "function earned(address) view returns (uint256)"],
    wallet
  );

  const rewardToken = new ethers.Contract(rewardTokenAddress, ERC20_ABI, wallet);
  const decimals = Number(await rewardToken.decimals());
  const pending: bigint = await stakingContract.earned(wallet.address);
  console.log(`[11] Pending rewards: ${ethers.formatUnits(pending, decimals)} tokens`);

  if (pending === 0n) {
    console.log("[11] Nothing to claim.");
    return;
  }

  const tx = await stakingContract.getReward();
  console.log(`[11] getReward tx: ${tx.hash}`);
  await tx.wait();
  const balance: bigint = await rewardToken.balanceOf(wallet.address);
  console.log(`[11] Reward token balance: ${ethers.formatUnits(balance, decimals)}`);
}

main().catch((error) => {
  console.error("[11] Reward claim failed:", error);
  process.exit(1);
});
