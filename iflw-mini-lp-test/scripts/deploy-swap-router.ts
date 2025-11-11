import { ethers } from "hardhat";
import swapRouterArtifact from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";

const FACTORY = process.env.UNIV3_FACTORY!;
const WETH = process.env.WETH!;

async function main() {
  if (!FACTORY || !WETH) throw new Error("Set factory & WETH addresses");
  const [deployer] = await ethers.getSigners();
  console.log("[swap-router] deploying with", deployer.address);

  const SwapRouter02 = new ethers.ContractFactory(
    swapRouterArtifact.abi,
    swapRouterArtifact.bytecode,
    deployer
  );
  const router = await SwapRouter02.deploy(FACTORY, WETH);

  await router.waitForDeployment();
  console.log("[swap-router] deployed at", await router.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
