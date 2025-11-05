import { ethers } from "ethers";
import TokenArtifact from "../artifacts/contracts/IFLWTestToken.sol/IFLWTestToken.json";
import { getWallet, getDecimals } from "./shared/env";

interface DeployOverrides {
  name?: string;
  symbol?: string;
  initialSupply?: string;
}

const DEFAULTS: Required<DeployOverrides> = {
  name: "IndexFlow LP Test Token",
  symbol: "IFLW",
  initialSupply: "1000000",
};

function parseArgs(): DeployOverrides {
  const overrides: DeployOverrides = {};
  for (const arg of process.argv.slice(2)) {
    const [key, value] = arg.split("=");
    if (!value) continue;
    if (key === "name") overrides.name = value;
    if (key === "symbol") overrides.symbol = value;
    if (key === "initialSupply") overrides.initialSupply = value;
  }
  return overrides;
}

async function main() {
  const overrides = { ...DEFAULTS, ...parseArgs() };
  const wallet = getWallet();
  console.log(`[01] Deploying IFLWTestToken with signer ${wallet.address}`);

  const factory = new ethers.ContractFactory(TokenArtifact.abi, TokenArtifact.bytecode, wallet);
  const contract = await factory.deploy(overrides.name, overrides.symbol);
  console.log("[01] Awaiting deployment...");
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`[01] Token deployed at: ${address}`);

  const decimals = getDecimals();
  const mintAmount = ethers.parseUnits(overrides.initialSupply, decimals);
  const mintTx = await contract.mint(wallet.address, mintAmount);
  console.log(`[01] Minting ${overrides.initialSupply} ${overrides.symbol} (${mintAmount} raw units) to ${wallet.address}`);
  await mintTx.wait();

  const balance = await contract.balanceOf(wallet.address);
  console.log(`[01] Deployer balance: ${balance.toString()}`);
  console.log("[01] Remember to set IFLW_TOKEN in your .env with the deployed address.");
}

main().catch((error) => {
  console.error("[01] Deployment failed:", error);
  process.exit(1);
});
