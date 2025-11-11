import { ethers } from "hardhat";
import factoryArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("[factory] deploying with", deployer.address);

  const Factory = new ethers.ContractFactory(
    factoryArtifact.abi,
    factoryArtifact.bytecode,
    deployer
  );

  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  console.log("[factory] deployed at", await factory.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
