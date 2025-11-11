import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with ${deployer.address}`);

  const registry = await ethers.deployContract("ValidatorRegistry");
  await registry.waitForDeployment();
  console.log(`ValidatorRegistry deployed at ${registry.target}`);

  const baseReward = ethers.parseEther("0.01");
  const uptimeMultiplier = ethers.parseEther("0.001");

  const staking = await ethers.deployContract("StakingRewards", [registry.target, baseReward, uptimeMultiplier]);
  await staking.waitForDeployment();
  console.log(`StakingRewards deployed at ${staking.target}`);

  const setTx = await registry.setStakingContract(staking.target);
  await setTx.wait();
  console.log("Linked staking contract to registry");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
