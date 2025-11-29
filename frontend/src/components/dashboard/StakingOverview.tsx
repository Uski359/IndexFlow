"use client";

import { useAccount, useContractRead } from "wagmi";
import { formatEther } from "viem";
import { useStakingContract } from "@/lib/hooks/useStakingContract";

const STAKED_BALANCE_SCOPE = "staking-balance";
const EARNED_BALANCE_SCOPE = "staking-earned";

export function StakingOverview() {
  const { contractConfig } = useStakingContract();
  const { address, status } = useAccount();
  const isConnected = status === "connected" && !!address;
  const canQuery = isConnected && !!contractConfig.address;

  const { data: stakedBalance } = useContractRead({
    ...contractConfig,
    functionName: "balances",
    args: address ? [address] : undefined,
    enabled: canQuery,
    watch: true,
    scopeKey: STAKED_BALANCE_SCOPE
  });

  const { data: earnedBalance } = useContractRead({
    ...contractConfig,
    functionName: "earned",
    args: address ? [address] : undefined,
    enabled: canQuery,
    watch: true,
    scopeKey: EARNED_BALANCE_SCOPE
  });

  const { data: totalStaked } = useContractRead({
    ...contractConfig,
    functionName: "totalStaked",
    enabled: !!contractConfig.address,
    watch: true
  });

  const stakedDisplay = stakedBalance ? Number(formatEther(stakedBalance as bigint)).toFixed(2) : "0.00";
  const rewardsDisplay = earnedBalance ? Number(formatEther(earnedBalance as bigint)).toFixed(2) : "0.00";
  const totalStakedDisplay = totalStaked ? Number(formatEther(totalStaked as bigint)).toLocaleString() : "0.00";

  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">Staking dashboard</h1>
            <p className="mt-2 text-white/70">Stake IFLW to secure the network and earn streaming rewards per indexing batch.</p>
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
            <p className="text-sm text-white/60">Network total staked</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totalStakedDisplay} IFLW</p>
            <p className="mt-1 text-xs text-white/40">Live from contract</p>
          </div>
        </div>
      </div>
    </section>
  );
}
