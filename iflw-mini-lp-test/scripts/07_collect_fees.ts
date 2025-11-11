import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import { NONFUNGIBLE_POSITION_MANAGER_ABI, ERC20_ABI } from "./shared/abis";

const MAX_UINT128 = (1n << 128n) - 1n;

function parseTokenId(): bigint {
  const entry = process.argv
    .slice(2)
    .map((arg) => arg.split("=") as [string, string])
    .find(([key]) => key === "tokenId");
  if (!entry) {
    throw new Error("tokenId=<id> argument required");
  }
  const id = BigInt(entry[1]);
  return id;
}

async function main() {
  const tokenId = parseTokenId();
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const positionManager = new ethers.Contract(
    contracts.positionManager,
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    wallet
  );

  const position = await positionManager.positions(tokenId);
  console.log(`[07] Position ${tokenId} info:`);
  console.log({
    token0: position.token0,
    token1: position.token1,
    fee: position.fee,
    liquidity: position.liquidity.toString(),
    owedToken0: position.tokensOwed0.toString(),
    owedToken1: position.tokensOwed1.toString(),
  });

  const collectParams = {
    tokenId,
    recipient: wallet.address,
    amount0Max: MAX_UINT128,
    amount1Max: MAX_UINT128,
  };

  const tx = await positionManager.collect(collectParams);
  console.log(`[07] Collect tx submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  const iface = new ethers.Interface(NONFUNGIBLE_POSITION_MANAGER_ABI);
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = iface.parseLog(log);
      if (!parsed) continue;
      if (parsed.name === "Collect") {
        console.log(
          `[07] Collected amount0=${parsed.args.amount0} amount1=${parsed.args.amount1}`
        );
      }
    } catch (error) {
      continue;
    }
  }

  console.log(`[07] Fees collected. Check balances if needed.`);
}

main().catch((error) => {
  console.error("[07] Fee collection failed:", error);
  process.exit(1);
});
