import { ethers } from "ethers";
import { getWallet, getUniswapContracts, getFeeTier } from "./shared/env";
import { SWAP_ROUTER_ABI, ERC20_ABI } from "./shared/abis";

interface SwapArgs {
  amount?: string;
  direction?: "WETH_IFLW" | "IFLW_WETH";
}

function parseArgs(): SwapArgs {
  const input = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  const direction = input.direction?.toUpperCase();
  return {
    amount: input.amount,
    direction: direction === "IFLW_WETH" ? "IFLW_WETH" : "WETH_IFLW",
  };
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
  console.log(`[06] Approving ${await token.symbol()} for swap router -> ${tx.hash}`);
  await tx.wait();
}

async function main() {
  const args = parseArgs();
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const fee = getFeeTier();

  if (!contracts.iflwToken) {
    throw new Error("IFLW_TOKEN not set in .env");
  }

  const router = new ethers.Contract(contracts.router, SWAP_ROUTER_ABI, wallet);
  const tokenInAddress = args.direction === "IFLW_WETH" ? contracts.iflwToken : contracts.weth;
  const tokenOutAddress = args.direction === "IFLW_WETH" ? contracts.weth : contracts.iflwToken;

  const tokenIn = new ethers.Contract(tokenInAddress, ERC20_ABI, wallet);
  const tokenOut = new ethers.Contract(tokenOutAddress, ERC20_ABI, wallet);
  const decimalsIn = Number(await tokenIn.decimals());
  const decimalsOut = Number(await tokenOut.decimals());

  const amountHuman = args.amount ?? (args.direction === "IFLW_WETH" ? "1000" : "0.01");
  const amountIn = ethers.parseUnits(amountHuman, decimalsIn);

  await ensureAllowance(tokenIn, wallet.address, contracts.router, amountIn);

  const params = {
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    fee,
    recipient: wallet.address,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  const exactInput = router.getFunction("exactInputSingle");
  const expectedAmountOut = await exactInput.staticCall(params);
  console.log(
    `[06] Expected output: ${ethers.formatUnits(expectedAmountOut, decimalsOut)} (${await tokenOut.symbol()})`
  );

  const tx = await router.exactInputSingle(params);
  console.log(`[06] Swap tx submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`[06] Swap confirmed in block ${receipt?.blockNumber}`);
}

main().catch((error) => {
  console.error("[06] Swap execution failed:", error);
  process.exit(1);
});
