import { REQUIRED_ENV_VARS, getEnvVar, getUniswapContracts, getFeeTier, getPriceRatio, getDecimals } from "./shared/env";

async function main() {
  console.log("[00] Loaded environment variables:");
  for (const key of REQUIRED_ENV_VARS) {
    try {
      const value = getEnvVar(key);
      if (key.toLowerCase().includes("key")) {
        console.log(`  ${key}: set (hidden)`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    } catch (error) {
      console.error(`  ${key}: missing -> ${(error as Error).message}`);
    }
  }

  const uniswap = getUniswapContracts();
  console.log("\n[00] Uniswap contract addresses:");
  console.table({
    factory: uniswap.factory,
    positionManager: uniswap.positionManager,
    swapRouter: uniswap.router,
    quoter: uniswap.quoter,
    weth: uniswap.weth,
    usdc: uniswap.usdc ?? "<not set>",
    iflwToken: uniswap.iflwToken ?? "<not set>",
    stakingToken: uniswap.stakingToken ?? "<not set>",
    rewardToken: uniswap.rewardToken ?? "<not set>",
    stakingRewards: uniswap.stakingRewards ?? "<not set>",
    unifiedWrapper: uniswap.unifiedWrapper ?? "<not set>",
  });

  console.log("\n[00] Fee tier:", getFeeTier());
  const price = getPriceRatio();
  console.log(`[00] Target price ratio (token1/token0): ${price.numerator.toString()} / ${price.denominator.toString()}`);
  console.log(`[00] Token decimals: ${getDecimals()}`);
}

main().catch((error) => {
  console.error("Environment sanity check failed:", error);
  process.exit(1);
});
