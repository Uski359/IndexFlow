import { readFileSync } from "fs";
import { resolve } from "path";
import { ethers } from "ethers";
import {
  getWallet,
  getUniswapContracts,
  getFeeTier,
  getPriceRatio,
} from "./shared/env";
import { sortTokens } from "./shared/tokens";
import {
  NONFUNGIBLE_POSITION_MANAGER_ABI,
  UNISWAP_V3_FACTORY_ABI,
  ERC20_ABI,
} from "./shared/abis";
import { ratioToSqrtPriceX96, getTickSpacing, priceToTick, nearestUsableTick } from "./shared/math";

interface RangeConfig {
  pair: string;
  price: {
    p0: number;
    lower: number;
    upper: number;
  };
  amounts: {
    token0: string;
    token1: string;
  };
  notes?: string;
}

function resolveQuoteAsset(symbol: string): "WETH" | "USDC" {
  const normalized = symbol.toUpperCase();
  if (normalized === "WETH" || normalized === "USDC") {
    return normalized;
  }
  throw new Error(`Unsupported quote asset ${symbol} in config. Use WETH or USDC.`);
}

function parseConfig(pathArg?: string): RangeConfig {
  const absolute = resolve(process.cwd(), pathArg ?? "config/ranges.example.json");
  const json = readFileSync(absolute, "utf8");
  const data: RangeConfig = JSON.parse(json);
  return data;
}

async function ensureAllowance(
  token: ethers.Contract,
  owner: string,
  spender: string,
  desired: bigint
) {
  const allowance: bigint = await token.allowance(owner, spender);
  if (allowance >= desired) {
    return;
  }
  const tx = await token.approve(spender, desired);
  console.log(`[04] Approving ${await token.symbol()} for ${spender} -> ${tx.hash}`);
  await tx.wait();
}

function extractPairSymbols(pair: string): { base: string; quote: string } {
  const [base, quote] = pair.split("/").map((p) => p.trim());
  if (!base || !quote) {
    throw new Error(`Invalid pair format in config: ${pair}`);
  }
  return { base: base.toUpperCase(), quote: quote.toUpperCase() };
}

async function main() {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );

  const config = parseConfig(args.config);
  const { base, quote } = extractPairSymbols(config.pair);

  const wallet = getWallet();
  const contracts = getUniswapContracts();

  const baseAddress =
    base === "IFLW"
      ? contracts.iflwToken ?? contracts.stakingToken ?? contracts.rewardToken
      : base === "WETH"
      ? contracts.weth
      : contracts.usdc;
  if (!baseAddress) {
    throw new Error(`Unsupported base token ${base}`);
  }

  const quoteSelection = resolveQuoteAsset(quote);
  const quoteAddress = quoteSelection === "USDC" ? contracts.usdc : contracts.weth;
  if (!quoteAddress) {
    throw new Error(`Quote token ${quoteSelection} not configured`);
  }

  const baseTokenContract = new ethers.Contract(baseAddress, ERC20_ABI, wallet);
  const quoteTokenContract = new ethers.Contract(quoteAddress, ERC20_ABI, wallet);
  const baseDecimals = Number(await baseTokenContract.decimals());
  const quoteDecimals = Number(await quoteTokenContract.decimals());

  const { token0, token1, flipped } = sortTokens(baseAddress, quoteAddress);
  const fee = getFeeTier();
  const tickSpacing = getTickSpacing(fee);

  const factory = new ethers.Contract(contracts.factory, UNISWAP_V3_FACTORY_ABI, wallet);
  const poolAddress: string = await factory.getPool(token0, token1, fee);
  if (!poolAddress || poolAddress === ethers.ZeroAddress) {
    throw new Error("Pool not found. Run 02_create_pool.ts first.");
  }

  const positionManager = new ethers.Contract(
    contracts.positionManager,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    wallet
  );

  const priceRatio = getPriceRatio();
  const basePrice = Number(priceRatio.numerator) / Number(priceRatio.denominator);

  const basePriceForPool = flipped ? 1 / basePrice : basePrice;
  const lowerPrice = basePriceForPool * config.price.lower;
  const upperPrice = basePriceForPool * config.price.upper;

  if (!(lowerPrice < upperPrice)) {
    throw new Error(`Invalid price range: lower (${lowerPrice}) must be < upper (${upperPrice})`);
  }

  const lowerTick = nearestUsableTick(priceToTick(lowerPrice), tickSpacing);
  const upperTick = nearestUsableTick(priceToTick(upperPrice), tickSpacing);

  if (lowerTick >= upperTick) {
    throw new Error(`Computed ticks are invalid: lower=${lowerTick}, upper=${upperTick}`);
  }

  const amountBaseHuman = config.amounts.token0;
  const amountQuoteHuman = config.amounts.token1;
  const amountBase = ethers.parseUnits(amountBaseHuman, baseDecimals);
  const amountQuote = ethers.parseUnits(amountQuoteHuman, quoteDecimals);

  const amount0Desired = flipped ? amountQuote : amountBase;
  const amount1Desired = flipped ? amountBase : amountQuote;

  await ensureAllowance(baseTokenContract, wallet.address, contracts.positionManager, amountBase);
  await ensureAllowance(quoteTokenContract, wallet.address, contracts.positionManager, amountQuote);

  const slippageBps = 700n; // 70%
  const denominator = 1000n;

  const params = {
    token0,
    token1,
    fee,
    tickLower: lowerTick,
    tickUpper: upperTick,
    amount0Desired,
    amount1Desired,
    amount0Min: (amount0Desired * slippageBps) / denominator,
    amount1Min: (amount1Desired * slippageBps) / denominator,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
  };

  console.log("[04] Minting liquidity with params:", params);
  const tx = await positionManager.mint(params);
  console.log(`[04] Submitted mint tx: ${tx.hash}`);
  const receipt = await tx.wait();

  const iface = new ethers.Interface(NONFUNGIBLE_POSITION_MANAGER_ABI);
  let mintedTokenId = "";
  let liquidity: bigint | undefined;
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed) {
        continue;
      }

      if (parsed.name === "IncreaseLiquidity") {
        mintedTokenId = (parsed.args.tokenId as bigint).toString();
        liquidity = parsed.args.liquidity as bigint;
        console.log(`[04] Liquidity added. tokenId=${mintedTokenId}, liquidity=${liquidity}`);
        console.log(`      amount0=${parsed.args.amount0}, amount1=${parsed.args.amount1}`);
      }
    } catch (error) {
      continue;
    }
  }

  if (!mintedTokenId) {
    console.warn("[04] Could not parse IncreaseLiquidity event. Use positionManager positions() to inspect manually.");
  }
}

main().catch((error) => {
  console.error("[04] Add liquidity failed:", error);
  process.exit(1);
});
