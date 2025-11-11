import { ethers } from "hardhat";
import quoterArtifact from "@uniswap/v3-periphery/artifacts/contracts/lens/QuoterV2.sol/QuoterV2.json";

const FACTORY = process.env.UNIV3_FACTORY!;
const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";

async function main() {
  if (!FACTORY) throw new Error("Set UNIV3_FACTORY in .env");
  const [deployer] = await ethers.getSigners();
  console.log("[quoter] deploying with", deployer.address);

  const QuoterV2 = new ethers.ContractFactory(
    quoterArtifact.abi,
    quoterArtifact.bytecode,
    deployer
  );
  const quoter = await QuoterV2.deploy(FACTORY, WETH);

  await quoter.waitForDeployment();
  console.log("[quoter] deployed at", await quoter.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
