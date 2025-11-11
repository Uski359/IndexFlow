import { ethers } from "hardhat";
import positionManagerArtifact from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";

console.log("[position-manager] script started");


const FACTORY = process.env.UNIV3_FACTORY!;
const WETH = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"; // Sepolia WETH9
const TOKEN_DESCRIPTOR = ethers.ZeroAddress; // İstersen NFT descriptor deploy edip buraya koyabilirsin

async function main() {
  if (!FACTORY) throw new Error("Set UNIV3_FACTORY in .env");
  const [deployer] = await ethers.getSigners();
  console.log("[position-manager] deploying with", deployer.address);

  const PositionManager = new ethers.ContractFactory(
    positionManagerArtifact.abi,
    positionManagerArtifact.bytecode,
    deployer
  );
  const manager = await PositionManager.deploy(FACTORY, WETH, TOKEN_DESCRIPTOR);

  await manager.waitForDeployment();
  console.log("[position-manager] deployed at", await manager.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
