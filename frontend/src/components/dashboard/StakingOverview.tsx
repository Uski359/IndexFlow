"use client";

import { useAccount, useContractRead } from "wagmi";
import { formatEther } from "viem";
import { env } from "@/lib/env";
import { stakingAbi } from "@/lib/contracts/stakingAbi";

const stakingAddress = env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}` | undefined;

export function StakingOverview() {
  const { address, status } = useAccount();
  const isConnected = status === "connected" && !!address;
  const canQuery = isConnected && !!stakingAddress;

  const { data: stakedBalance } = useContractRead({
    address: stakingAddress,
    abi: stakingAbi,
    functionName: "balances",
    args: address ? [address] : undefined,
    enabled: canQuery,
    watch: true
  });

  const { data: earnedBalance } = useContractRead({
    address: stakingAddress,
    abi: stakingAbi,
    functionName: "earned",
    args: address ? [address] : undefined,
    enabled: canQuery,
    watch: true
  });

  const stakedDisplay = stakedBalance ? Number(formatEther(stakedBalance as bigint)).toFixed(2) : "0.00";
  const rewardsDisplay = earnedBalance ? Number(formatEther(earnedBalance as bigint)).toFixed(2) : "0.00";

  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">Staking dashboard</h1>
            <p className="mt-2 text-white/70">
              {stakingAddress
                ? "Stake IFLW to secure the network and earn streaming rewards per indexing batch."
                : "Demo mode: set NEXT_PUBLIC_STAKING_CONTRACT to interact with the on-chain staking contract."}
            </p>
          </div>
          <div className="text-sm text-white/60">
            Status: <span className="font-medium text-white">{isConnected ? "Wallet connected" : "Connect wallet"}</span>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="card">
            <p className="text-sm text-white/60">Your staked balance</p>
            <p className="mt-2 text-3xl font-semibold text-white">{stakedDisplay} IFLW</p>
          </div>
          <div className="card">
            <p className="text-sm text-white/60">Unclaimed rewards</p>
            <p className="mt-2 text-3xl font-semibold text-white">{rewardsDisplay} IFLW</p>
          </div>
          <div className="card">
            <p className="text-sm text-white/60">Current APR</p>
            <p className="mt-2 text-3xl font-semibold text-white">18.0%</p>
            <p className="mt-1 text-xs text-white/40">Projected for active indexers</p>
          </div>
        </div>
      </div>
    </section>
  );
}
