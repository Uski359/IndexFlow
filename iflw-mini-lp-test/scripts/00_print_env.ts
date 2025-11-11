import { REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS, getEnvVar, getRpcUrl, getUniswapContracts, getFeeTier, getPriceRatio, getDecimals } from "./shared/env";

async function main() {
  console.log("[00] Loaded environment variables:");
  const rpcCandidates = ["RPC_URL_SEPOLIA", "RPC_URL_GOERLI"] as const;
  for (const key of rpcCandidates) {
    const value = process.env[key];
    console.log(`  ${key}: ${value && value.trim().length > 0 ? value : "<not set>"}`);
  }

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

  for (const key of OPTIONAL_ENV_VARS) {
    if (key.startsWith("RPC_URL")) continue; // already displayed
    const value = process.env[key];
    console.log(`  ${key}: ${value && value.trim().length > 0 ? value : "<not set>"}`);
  }

  const activeRpc = getRpcUrl();
  console.log(`\n[00] Active RPC URL: ${activeRpc}`);

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
