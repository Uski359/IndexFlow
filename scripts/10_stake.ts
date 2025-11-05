import { ethers } from "ethers";
import { getWallet, getUniswapContracts } from "./shared/env";
import { ERC20_ABI } from "./shared/abis";

function parseArgs() {
  const pairs = Object.fromEntries(
    process.argv
      .slice(2)
      .map((arg) => arg.split("=") as [string, string])
      .filter((pair) => pair.length === 2)
  );
  const amount = pairs.amount ?? "0";
  const mode = pairs.mode?.toLowerCase() ?? "stake";
  return { amount, mode };
}

async function main() {
  const { amount, mode } = parseArgs();
  const wallet = getWallet();
  const contracts = getUniswapContracts();
  const stakingAddress = contracts.stakingRewards;
  if (!stakingAddress) {
    throw new Error("STAKING_REWARDS not set. Deploy staking contract first.");
  }
  const stakingTokenAddress = contracts.stakingToken ?? contracts.iflwToken;
  if (!stakingTokenAddress) {
    throw new Error("Set STAKING_TOKEN (or IFLW_TOKEN) in .env");
  }

  const stakingToken = new ethers.Contract(stakingTokenAddress, ERC20_ABI, wallet);
  const decimals = Number(await stakingToken.decimals());
  const parsed = ethers.parseUnits(amount, decimals);

  const stakingContract = new ethers.Contract(
    stakingAddress,
    [
      "function stake(uint256 amount)",
      "function exit()",
      "function withdraw(uint256 amount)",
      "function balances(address) view returns (uint256)",
    ],
    wallet
  );

  if (mode === "stake") {
    console.log(`[10] Staking ${amount} units`);
    const allowance: bigint = await stakingToken.allowance(wallet.address, stakingAddress);
    if (allowance < parsed) {
      const approveTx = await stakingToken.approve(stakingAddress, parsed);
      console.log(`[10] Approving staking token -> ${approveTx.hash}`);
      await approveTx.wait();
    }
    const tx = await stakingContract.stake(parsed);
    console.log(`[10] Stake tx: ${tx.hash}`);
    await tx.wait();
  } else if (mode === "withdraw") {
    console.log(`[10] Withdrawing ${amount} units`);
    const tx = await stakingContract.withdraw(parsed);
    console.log(`[10] Withdraw tx: ${tx.hash}`);
    await tx.wait();
  } else if (mode === "exit") {
    console.log(`[10] Exiting position`);
    const tx = await stakingContract.exit();
    console.log(`[10] Exit tx: ${tx.hash}`);
    await tx.wait();
  } else {
    throw new Error(`Unsupported mode ${mode}. Use stake|withdraw|exit`);
  }

  const balance: bigint = await stakingContract.balances(wallet.address);
  console.log(`[10] Current staked balance: ${ethers.formatUnits(balance, decimals)}`);
}

main().catch((error) => {
  console.error("[10] Staking interaction failed:", error);
  process.exit(1);
});
