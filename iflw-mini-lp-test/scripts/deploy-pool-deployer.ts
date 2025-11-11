import { ethers } from "hardhat";
import poolDeployerArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3PoolDeployer.sol/UniswapV3PoolDeployer.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("[pool-deployer] deploying with", deployer.address);

  const PoolDeployer = new ethers.ContractFactory(
    poolDeployerArtifact.abi,
    poolDeployerArtifact.bytecode,
    deployer
  );
  const poolDeployer = await PoolDeployer.deploy();

  await poolDeployer.waitForDeployment();
  console.log("[pool-deployer] deployed at", await poolDeployer.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
