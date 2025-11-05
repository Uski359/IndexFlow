import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import { ERC20_ABI } from "./shared/abis";

const WRAPPER_ABI = [
  "function deposit(uint256 amount)",
  "function withdraw(uint256 shares)",
  "function claim()",
  "function exit()",
  "function balanceOf(address owner) view returns (uint256)",
  "function totalUnderlying() view returns (uint256)",
  "function pendingRewards(address account) view returns (uint256)",
];

function parseArgs() {
  const entries = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  return {
    action: (entries.action ?? "status").toLowerCase(),
    amount: entries.amount,
  };
}

async function main() {
  const { action, amount } = parseArgs();
  const wallet = getWallet();
  const env = getUniswapContracts();
  const wrapperAddress = env.unifiedWrapper;
  if (!wrapperAddress) {
    throw new Error("UNIFIED_WRAPPER not set. Deploy the wrapper and update .env");
  }

  const wrapper = new ethers.Contract(wrapperAddress, WRAPPER_ABI, wallet);
  const stakingTokenAddress = env.stakingToken ?? env.iflwToken;
  if (!stakingTokenAddress) {
    throw new Error("STAKING_TOKEN (or IFLW_TOKEN) must be set to use the wrapper");
  }
  const rewardTokenAddress = env.rewardToken ?? env.iflwToken;
  if (!rewardTokenAddress) {
    throw new Error("REWARD_TOKEN (or IFLW_TOKEN) must be set to use the wrapper");
  }

  const stakingToken = new ethers.Contract(stakingTokenAddress, ERC20_ABI, wallet);
  const rewardToken = new ethers.Contract(rewardTokenAddress, ERC20_ABI, wallet);
  const stakingDecimals = Number(await stakingToken.decimals());
  const rewardDecimals = Number(await rewardToken.decimals());

  if (action === "deposit") {
    if (!amount) {
      throw new Error("Provide amount=<tokens> when depositing");
    }
    const parsed = ethers.parseUnits(amount, stakingDecimals);
    const allowance: bigint = await stakingToken.allowance(wallet.address, wrapperAddress);
    if (allowance < parsed) {
      const approveTx = await stakingToken.approve(wrapperAddress, parsed);
      console.log(`[14] Approving staking token -> ${approveTx.hash}`);
      await approveTx.wait();
    }
    const tx = await wrapper.deposit(parsed);
    console.log(`[14] deposit tx: ${tx.hash}`);
    await tx.wait();
  } else if (action === "withdraw") {
    if (!amount) {
      throw new Error("Provide amount=<shares> when withdrawing");
    }
    const parsed = ethers.parseUnits(amount, stakingDecimals);
    const tx = await wrapper.withdraw(parsed);
    console.log(`[14] withdraw tx: ${tx.hash}`);
    await tx.wait();
  } else if (action === "claim") {
    const tx = await wrapper.claim();
    console.log(`[14] claim tx: ${tx.hash}`);
    await tx.wait();
  } else if (action === "exit") {
    const tx = await wrapper.exit();
    console.log(`[14] exit tx: ${tx.hash}`);
    await tx.wait();
  } else if (action !== "status") {
    throw new Error(`Unsupported action ${action}`);
  }

  const shares: bigint = await wrapper.balanceOf(wallet.address);
  const pending: bigint = await wrapper.pendingRewards(wallet.address);
  const totalUnderlying: bigint = await wrapper.totalUnderlying();
  console.log(`[14] Shares: ${ethers.formatUnits(shares, stakingDecimals)}`);
  console.log(`[14] Pending rewards: ${ethers.formatUnits(pending, rewardDecimals)}`);
  console.log(`[14] Total underlying staked by wrapper: ${ethers.formatUnits(totalUnderlying, stakingDecimals)}`);
}

main().catch((error) => {
  console.error("[14] Wrapper action failed:", error);
  process.exit(1);
});
