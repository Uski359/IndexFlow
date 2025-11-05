import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import StakingArtifact from "../artifacts/contracts/IFLWStakingRewards.sol/IFLWStakingRewards.json";

function parseArgs() {
  const pairs = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  return {
    duration: pairs.duration ? Number(pairs.duration) : 7 * 24 * 60 * 60,
  };
}

async function main() {
  const { duration } = parseArgs();
  const wallet = getWallet();
  const env = getUniswapContracts();
  const stakingToken = env.stakingToken ?? env.iflwToken;
  const rewardToken = env.rewardToken ?? env.iflwToken;

  if (!stakingToken) {
    throw new Error("Set STAKING_TOKEN or IFLW_TOKEN in the .env file");
  }
  if (!rewardToken) {
    throw new Error("Set REWARD_TOKEN (defaults to IFLW if omitted)");
  }

  console.log(`[09] Deploying staking contract with staking=${stakingToken}, reward=${rewardToken}`);
  const factory = new ethers.ContractFactory(StakingArtifact.abi, StakingArtifact.bytecode, wallet);
  const contract = await factory.deploy(stakingToken, rewardToken, duration);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[09] IFLWStakingRewards deployed at: ${address}`);
  console.log("[09] Update STAKING_REWARDS in your .env file with this address.");
}

main().catch((error) => {
  console.error("[09] Staking deployment failed:", error);
  process.exit(1);
});
