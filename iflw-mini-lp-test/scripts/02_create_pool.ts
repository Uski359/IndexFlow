import { ethers } from "ethers";
import { getWallet, getUniswapContracts, getFeeTier } from "./shared/env";
import { sortTokens } from "./shared/tokens";
import { UNISWAP_V3_FACTORY_ABI, NONFUNGIBLE_POSITION_MANAGER_ABI } from "./shared/abis";

function resolveQuoteAsset(preferred?: string): "WETH" | "USDC" {
  if (!preferred) return "WETH";
  const normalized = preferred.toUpperCase();
  if (normalized === "WETH" || normalized === "USDC") {
    return normalized;
  }
  throw new Error(`Unsupported quote asset ${preferred}. Use WETH or USDC.`);
}

async function main() {
  const overrides = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((entry) => entry.length === 2)
  );
  const quoteSelection = resolveQuoteAsset(overrides.quote);

  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const baseToken = contracts.iflwToken;
  if (!baseToken) {
    throw new Error("IFLW_TOKEN is not set. Deploy the token and add its address to .env");
  }

  const quoteAddress = quoteSelection === "USDC" ? contracts.usdc : contracts.weth;
  if (!quoteAddress) {
    throw new Error(`Quote asset ${quoteSelection} not configured in .env`);
  }

  const { token0, token1, flipped } = sortTokens(baseToken, quoteAddress);
  const fee = getFeeTier();

  console.log(`
[02] Creating pool for ${token0} / ${token1} at fee tier ${fee}`);
  const positionManager = new ethers.Contract(
    contracts.positionManager,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    wallet
  );
  const factoryAddress: string = await positionManager.factory();
  const factory = new ethers.Contract(factoryAddress, UNISWAP_V3_FACTORY_ABI, wallet);

  const existingPool: string = await factory.getPool(token0, token1, fee);
  if (existingPool && existingPool !== ethers.ZeroAddress) {
    console.log(`[02] Pool already exists at ${existingPool}. Nothing to do.`);
    return;
  }

  const tx = await factory.createPool(token0, token1, fee);
  console.log(`[02] Submitted createPool tx: ${tx.hash}`);
  const receipt = await tx.wait();
  if (!receipt?.logs) {
    throw new Error("[02] Failed to retrieve transaction logs for pool creation");
  }

  const iface = new ethers.Interface(UNISWAP_V3_FACTORY_ABI);
  let poolAddress = "";
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PoolCreated") {
        poolAddress = parsed.args.pool as string;
        break;
      }
    } catch (error) {
      continue;
    }
  }

  if (!poolAddress) {
    throw new Error("[02] Could not parse PoolCreated event from transaction receipt");
  }

  console.log(`[02] Pool created at: ${poolAddress}`);
  console.log(`[02] Token order: token0=${token0}, token1=${token1}, baseTokenIsToken0=${!flipped}`);
}

main().catch((error) => {
  console.error("[02] Pool creation failed:", error);
  process.exit(1);
});
