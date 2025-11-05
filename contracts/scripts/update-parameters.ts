import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ethers, network } from "hardhat";

function getArg(key: string): string | undefined {
  const flag = `--${key}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  if (index + 1 >= process.argv.length) {
    throw new Error(`Flag ${flag} requires a value`);
  }
  return process.argv[index + 1];
}

async function main() {
  const networkName = network.name;
  const deploymentsDir = join(__dirname, "..", "deployments");
  const networkDeployment = join(deploymentsDir, `${networkName}-latest.json`);
  const deploymentFile = existsSync(networkDeployment)
    ? networkDeployment
    : join(deploymentsDir, "latest.json");

  const latest = JSON.parse(readFileSync(deploymentFile, "utf8"));
  const stakingAddress = latest.staking as string | undefined;
  const rewardsAddress = latest.rewards as string | undefined;

  if (!stakingAddress || !rewardsAddress) {
    throw new Error(`Deployment data missing staking or rewards contract for network ${networkName}`);
  }

  const [signer] = await ethers.getSigners();
  console.log(`Updating contracts on ${networkName} with signer ${await signer.getAddress()}`);

  const staking = await ethers.getContractAt("IndexFlowStaking", stakingAddress, signer);
  const rewards = await ethers.getContractAt("IndexFlowRewards", rewardsAddress, signer);

  const minStakeArg = getArg("minimumStake");
  if (minStakeArg) {
    const minStake = ethers.parseEther(minStakeArg);
    console.log(` - Setting minimum stake to ${minStakeArg} IFLW`);
    await (await staking.setMinimumStake(minStake)).wait();
  }

  const lockPeriodArg = getArg("lockPeriod");
  if (lockPeriodArg) {
    const lockPeriod = Number(lockPeriodArg);
    console.log(` - Setting lock period to ${lockPeriod} seconds`);
    await (await staking.setLockPeriod(lockPeriod)).wait();
  }

  const indexerShareArg = getArg("indexerShareBps");
  const minimumIndexerStakeArg = getArg("minimumIndexerStake");
  const confirmationDepthArg = getArg("confirmationDepth");

  if (indexerShareArg || minimumIndexerStakeArg || confirmationDepthArg) {
    const current = await rewards.indexerShareBps();
    const newIndexerShare = indexerShareArg ? Number(indexerShareArg) : Number(current);
    const newMinimumIndexerStake = minimumIndexerStakeArg
      ? ethers.parseEther(minimumIndexerStakeArg)
      : await rewards.minimumIndexerStake();
    const newConfirmationDepth = confirmationDepthArg
      ? Number(confirmationDepthArg)
      : await rewards.confirmationDepth();

    console.log(
      ` - Updating reward parameters (share=${newIndexerShare} bps, minimum stake=${ethers.formatEther(
        newMinimumIndexerStake
      )} IFLW, confirmations=${newConfirmationDepth})`
    );
    await (
      await rewards.setParameters(newIndexerShare, newMinimumIndexerStake, newConfirmationDepth)
    ).wait();
  }

  console.log("Parameter update complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
