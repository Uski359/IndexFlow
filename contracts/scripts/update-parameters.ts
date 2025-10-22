import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ethers, network } from "hardhat";

function getArg(key: string): string | undefined {
  const index = process.argv.indexOf(`--${key}`);
  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[index + 1];
}

function requiredArg(key: string, fallback?: string) {
  const value = getArg(key) ?? fallback;
  if (!value) {
    console.error(`Missing required argument --${key}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const networkName = network.name;
  const baseRewardInput = requiredArg("baseReward");
  const challengeBondInput = requiredArg("challengeBond");
  const quorumInput = requiredArg("validatorQuorumBps");
  const slashInput = requiredArg("slashPenaltyBps");

  const baseReward = ethers.parseEther(baseRewardInput);
  const challengeBond = ethers.parseEther(challengeBondInput);
  const validatorQuorumBps = BigInt(quorumInput);
  const slashPenaltyBps = BigInt(slashInput);

  const deploymentsDir = join(__dirname, "..", "deployments");
  const networkDeployment = join(deploymentsDir, `${networkName}-latest.json`);
  const deploymentFile = existsSync(networkDeployment)
    ? networkDeployment
    : join(deploymentsDir, "latest.json");
  const latest = JSON.parse(readFileSync(deploymentFile, "utf8"));
  console.log(`Using deployment file: ${deploymentFile}`);

  const daoAddress = latest.indexFlowDao as string;
  if (!daoAddress) {
    throw new Error(`DAO address not found in deployments for network ${networkName}`);
  }

  const [signer] = await ethers.getSigners();
  const dao = await ethers.getContractAt("IndexFlowDAO", daoAddress, signer);

  console.log(`Updating protocol parameters on ${networkName} using signer ${await signer.getAddress()}`);
  console.log(`Base reward: ${baseRewardInput} ETH`);
  console.log(`Challenge bond: ${challengeBondInput} ETH`);
  console.log(`Validator quorum: ${validatorQuorumBps} bps`);
  console.log(`Slash penalty cap: ${slashPenaltyBps} bps`);

  const tx = await dao.updateParameters({
    baseReward,
    challengeBond,
    validatorQuorumBps,
    slashPenaltyBps
  });
  await tx.wait();
  console.log(`Parameters updated in tx ${tx.hash}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
