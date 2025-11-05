import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import WrapperArtifact from "../artifacts/contracts/IFLWUnifiedWrapper.sol/IFLWUnifiedWrapper.json";

function parseArgs() {
  const entries = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  return {
    name: entries.name ?? "IFLOW",
    symbol: entries.symbol ?? "IFLOW",
  };
}

async function main() {
  const { name, symbol } = parseArgs();
  const wallet = getWallet();
  const env = getUniswapContracts();

  const stakingToken = env.stakingToken ?? env.iflwToken;
  if (!stakingToken) {
    throw new Error("Set STAKING_TOKEN or IFLW_TOKEN in .env before deploying wrapper");
  }
  const rewardToken = env.rewardToken ?? env.iflwToken;
  if (!rewardToken) {
    throw new Error("Set REWARD_TOKEN (defaults to IFLW) in .env before deploying wrapper");
  }
  if (!env.stakingRewards) {
    throw new Error("STAKING_REWARDS must be configured. Deploy staking contract first.");
  }

  console.log(`[13] Deploying unified wrapper with staking=${stakingToken}, reward=${rewardToken}`);
  const factory = new ethers.ContractFactory(WrapperArtifact.abi, WrapperArtifact.bytecode, wallet);
  const contract = await factory.deploy(stakingToken, rewardToken, env.stakingRewards, name, symbol);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`[13] IFLWUnifiedWrapper deployed at: ${address}`);
  console.log("[13] Update UNIFIED_WRAPPER in your .env file to expose the wrapper.");
}

main().catch((error) => {
  console.error("[13] Wrapper deployment failed:", error);
  process.exit(1);
});
