import { ethers } from "ethers";
import {
  getWallet,
  getUniswapContracts,
  getFeeTier,
  getPriceRatio,
} from "./shared/env";
import { sortTokens } from "./shared/tokens";
import { QUOTER_V2_ABI, UNISWAP_V3_FACTORY_ABI, ERC20_ABI } from "./shared/abis";

const USD_NOTIONALS = ["1000", "10000", "50000"];
const WETH_FALLBACK = ["0.01", "0.1", "0.5"];

async function formatToken(address: string, wallet: ethers.Signer) {
  const erc20 = new ethers.Contract(address, ERC20_ABI, wallet);
  const [symbol, decimals] = await Promise.all([erc20.symbol(), erc20.decimals()]);
  return { symbol, decimals: Number(decimals) };
}

async function quoteUsdFlows() {
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  if (!contracts.iflwToken) {
    throw new Error("IFLW_TOKEN not set.");
  }
  if (!contracts.usdc) {
    console.log("[05] USDC not configured. Falling back to WETH notionals.");
    return quoteWethFallback(wallet, contracts);
  }

  const quoter = new ethers.Contract(contracts.quoter, QUOTER_V2_ABI, wallet);
  const quoteExactInputSingle = quoter.getFunction("quoteExactInputSingle");
  const quoteExactOutputSingle = quoter.getFunction("quoteExactOutputSingle");
  const fee = getFeeTier();
  const usdcInfo = await formatToken(contracts.usdc, wallet);
  const iflwInfo = await formatToken(contracts.iflwToken, wallet);

  console.log(`[05] Quoting USDC -> IFLW for fee tier ${fee}`);
  for (const notional of USD_NOTIONALS) {
    const amountIn = ethers.parseUnits(notional, usdcInfo.decimals);
    const [amountOut] = await quoteExactInputSingle.staticCall([
      contracts.usdc,
      contracts.iflwToken,
      amountIn,
      fee,
      0,
    ]);
    console.log(`  exactInput USDC ${notional} -> IFLW ${ethers.formatUnits(amountOut, iflwInfo.decimals)}`);
  }

  console.log(`\n[05] Quoting IFLW -> USDC (exact output targets)`);
  for (const notional of USD_NOTIONALS) {
    const amountOut = ethers.parseUnits(notional, usdcInfo.decimals);
    const [amountIn] = await quoteExactOutputSingle.staticCall([
      contracts.iflwToken,
      contracts.usdc,
      amountOut,
      fee,
      0,
    ]);
    console.log(`  exactOutput USDC ${notional} requires IFLW ${ethers.formatUnits(amountIn, iflwInfo.decimals)}`);
  }
}

async function quoteWethFallback(wallet: ethers.Signer, contracts: ReturnType<typeof getUniswapContracts>) {
  if (!contracts.iflwToken) {
    throw new Error("IFLW_TOKEN not set.");
  }
  const quoter = new ethers.Contract(contracts.quoter, QUOTER_V2_ABI, wallet);
  const quoteExactInputSingle = quoter.getFunction("quoteExactInputSingle");
  const fee = getFeeTier();
  const wethInfo = await formatToken(contracts.weth, wallet);
  const iflwInfo = await formatToken(contracts.iflwToken, wallet);

  console.log(`[05] Approximate WETH notionals based on env price ratio`);
  const priceRatio = getPriceRatio();
  const basePrice = Number(priceRatio.numerator) / Number(priceRatio.denominator);
  console.log(`      1 IFLW ≈ ${basePrice} WETH (from .env)`);

  for (const amount of WETH_FALLBACK) {
    const amountIn = ethers.parseUnits(amount, wethInfo.decimals);
    const [amountOut] = await quoteExactInputSingle.staticCall([
      contracts.weth,
      contracts.iflwToken,
      amountIn,
      fee,
      0,
    ]);
    console.log(`  exactInput ${amount} WETH -> ${ethers.formatUnits(amountOut, iflwInfo.decimals)} IFLW`);
  }
}

async function main() {
  await quoteUsdFlows();
}

main().catch((error) => {
  console.error("[05] Quote retrieval failed:", error);
  process.exit(1);
});
