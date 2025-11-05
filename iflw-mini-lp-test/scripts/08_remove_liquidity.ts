import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import { NONFUNGIBLE_POSITION_MANAGER_ABI } from "./shared/abis";

interface Args {
  tokenId: bigint;
  percent: number;
}

function parseArgs(): Args {
  const entries = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  if (!entries.tokenId) {
    throw new Error("tokenId=<id> argument required");
  }
  const percent = entries.percent ? Number(entries.percent) : 100;
  if (percent <= 0 || percent > 100) {
    throw new Error("percent must be between 1 and 100");
  }
  return { tokenId: BigInt(entries.tokenId), percent };
}

async function main() {
  const { tokenId, percent } = parseArgs();
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const positionManager = new ethers.Contract(
    contracts.positionManager,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    wallet
  );

  const position = await positionManager.positions(tokenId);
  const liquidity: bigint = position.liquidity;
  const liquidityToRemove = (liquidity * BigInt(percent)) / 100n;
  if (liquidityToRemove === 0n) {
    throw new Error("Liquidity to remove is zero. Check position status.");
  }

  const params = {
    tokenId,
    liquidity: liquidityToRemove,
    amount0Min: 0,
    amount1Min: 0,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
  };

  console.log(`[08] Removing ${percent}% liquidity from tokenId=${tokenId}`);
  const decrease = await positionManager.decreaseLiquidity(params);
  console.log(`[08] decreaseLiquidity tx: ${decrease.hash}`);
  await decrease.wait();

  const collect = await positionManager.collect({
    tokenId,
    recipient: wallet.address,
    amount0Max: (1n << 128n) - 1n,
    amount1Max: (1n << 128n) - 1n,
  });
  console.log(`[08] collect tx: ${collect.hash}`);
  await collect.wait();

  if (percent === 100) {
    const burn = await positionManager.burn(tokenId);
    console.log(`[08] burn tx: ${burn.hash}`);
    await burn.wait();
    console.log("[08] Position fully removed and burned.");
  } else {
    console.log("[08] Partial removal complete. Position still active.");
  }
}

main().catch((error) => {
  console.error("[08] Remove liquidity failed:", error);
  process.exit(1);
});
