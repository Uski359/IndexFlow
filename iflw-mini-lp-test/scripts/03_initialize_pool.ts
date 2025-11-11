import { ethers } from "ethers";
import { getWallet, getUniswapContracts, getFeeTier, getPriceRatio } from "./shared/env";
import { sortTokens } from "./shared/tokens";
import { UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_POOL_ABI, ERC20_ABI } from "./shared/abis";
import { ratioToSqrtPriceX96 } from "./shared/math";

function resolveQuoteAsset(preferred?: string): "WETH" | "USDC" {
  if (!preferred) return "WETH";
  const normalized = preferred.toUpperCase();
  if (normalized === "WETH" || normalized === "USDC") {
    return normalized;
  }
  throw new Error(`Unsupported quote asset ${preferred}. Use WETH or USDC.`);
}

async function fetchDecimals(address: string, wallet: ethers.Signer): Promise<number> {
  const erc20 = new ethers.Contract(address, ERC20_ABI, wallet);
  const decimals: number = await erc20.decimals();
  return decimals;
}

async function main() {
  const overrides = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  const quoteSelection = resolveQuoteAsset(overrides.quote);

  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const baseToken = contracts.iflwToken ?? contracts.stakingToken ?? contracts.rewardToken;
  if (!baseToken) {
    throw new Error("Base token not set. Populate IFLW_TOKEN or STAKING_TOKEN in .env");
  }

  const quoteAddress = quoteSelection === "USDC" ? contracts.usdc : contracts.weth;
  if (!quoteAddress) {
    throw new Error(`Quote asset ${quoteSelection} not configured in .env`);
  }

  const { token0, token1 } = sortTokens(baseToken, quoteAddress);
  const fee = getFeeTier();

  const factory = new ethers.Contract(contracts.factory, UNISWAP_V3_FACTORY_ABI, wallet);
  const poolAddress: string = await factory.getPool(token0, token1, fee);
  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    throw new Error("Pool not found. Run 02_create_pool.ts first.");
  }

  const pool = new ethers.Contract(poolAddress, UNISWAP_V3_POOL_ABI, wallet);

  try {
    const slot0 = await pool.slot0();
    if (slot0.sqrtPriceX96 && slot0.sqrtPriceX96 !== 0n) {
      console.log(`[03] Pool already initialized. Current sqrtPriceX96: ${slot0.sqrtPriceX96}`);
      return;
    }
  } catch (error) {
    console.log("[03] Pool slot0 read failed (expected for uninitialized pools). Proceeding to initialize...");
  }

  const price = getPriceRatio();
  const decimalsBase = await fetchDecimals(baseToken, wallet);
  const decimalsQuote = await fetchDecimals(quoteAddress, wallet);

  const decimals0 = token0.toLowerCase() === baseToken.toLowerCase() ? decimalsBase : decimalsQuote;
  const decimals1 = token1.toLowerCase() === baseToken.toLowerCase() ? decimalsBase : decimalsQuote;
  const invert = token0.toLowerCase() === quoteAddress.toLowerCase();

  const sqrtPriceX96 = ratioToSqrtPriceX96(
    price.numerator,
    price.denominator,
    decimals0,
    decimals1,
    invert
  );

  console.log(`[03] Initializing pool ${poolAddress}`);
  console.log(`[03] sqrtPriceX96 target: ${sqrtPriceX96}`);

  const tx = await pool.initialize(sqrtPriceX96);
  console.log(`[03] Submitted initialize tx: ${tx.hash}`);
  await tx.wait();

  const slot0 = await pool.slot0();
  console.log(`[03] Pool initialized. sqrtPriceX96=${slot0.sqrtPriceX96}, tick=${slot0.tick}`);
  console.log(`[03] Tick spacing: ${await pool.tickSpacing()}`);
}

main().catch((error) => {
  console.error("[03] Pool initialization failed:", error);
  process.exit(1);
});
