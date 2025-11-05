"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseEther } from "viem";
import { useAccount, useContractWrite, useWaitForTransaction } from "wagmi";
import toast from "react-hot-toast";
import { stakingAbi } from "@/lib/contracts/stakingAbi";
import { env } from "@/lib/env";

const stakingAddress = env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}` | undefined;

const formSchema = z.object({
  amount: z
    .string()
    .min(0, "Amount must be positive")
    .refine((value) => Number(value) > 0, "Enter an amount above zero")
});

type FormValues = z.infer<typeof formSchema>;

export function StakingActions() {
  const { address, status } = useAccount();
  const isConnected = status === "connected" && !!address;
  const demoMode = !stakingAddress;

  const stakeForm = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { amount: "0" } });
  const unstakeForm = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { amount: "0" } });

  const {
    writeAsync,
    data: txData,
    isLoading: isPending
  } = useContractWrite({
    address: stakingAddress,
    abi: stakingAbi,
    mode: "recklesslyUnprepared"
  });
  const txHash = txData?.hash;
  const { isLoading: waitingReceipt } = useWaitForTransaction({ hash: txHash, enabled: Boolean(txHash) });
  const isBusy = isPending || waitingReceipt;
  const [pendingAction, setPendingAction] = useState<"stake" | "unstake" | "claim" | null>(null);

  const handleAction = (mode: "stake" | "unstake") => async ({ amount }: FormValues) => {
    if (!isConnected) {
      toast.error("Connect your wallet to continue");
      return;
    }
    if (!writeAsync) {
      toast.error("Wallet is not ready yet. Please try again.");
      return;
    }
    if (demoMode) {
      toast.success(`Demo: ${mode} ${amount} IFLW submitted`);
      return;
    }
    try {
      setPendingAction(mode);
      toast.loading(`${mode === "stake" ? "Staking" : "Unstaking"} in progress...`, { id: mode });
      await writeAsync({
        address: stakingAddress!,
        abi: stakingAbi,
        functionName: mode,
        args: [parseEther(amount)]
      });
    } catch (error) {
      console.error(error);
      toast.error("Transaction failed");
      setPendingAction(null);
    }
  };

  const claimRewards = async () => {
    if (!isConnected) {
      toast.error("Connect your wallet to continue");
      return;
    }
    if (!writeAsync) {
      toast.error("Wallet is not ready yet. Please try again.");
      return;
    }
    if (demoMode) {
      toast.success("Demo: rewards claimed");
      return;
    }
    try {
      setPendingAction("claim");
      toast.loading("Claiming rewards...", { id: "claim" });
      await writeAsync({ address: stakingAddress!, abi: stakingAbi, functionName: "claimRewards" });
    } catch (error) {
      console.error(error);
      toast.error("Claim failed");
      setPendingAction(null);
    }
  };

  useEffect(() => {
    if (!txHash || isBusy || !pendingAction) return;
    toast.success("Transaction confirmed", { id: pendingAction });
    stakeForm.reset();
    unstakeForm.reset();
    setPendingAction(null);
  }, [isBusy, pendingAction, stakeForm, txHash, unstakeForm]);

  return (
    <section className="section-spacing bg-black/40">
      <div className="mx-auto max-w-4xl px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <form onSubmit={stakeForm.handleSubmit(handleAction("stake"))} className="card space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Stake IFLW</h3>
              <p className="text-sm text-white/60">Lock tokens to earn validator rewards and secure the network.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-white/50">Amount</label>
              <input
                type="number"
                step="0.0001"
                inputMode="decimal"
                {...stakeForm.register("amount")}
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indexflow-primary"
                placeholder="0.0"
              />
              {stakeForm.formState.errors.amount && (
                <p className="text-xs text-indexflow-accent">{stakeForm.formState.errors.amount.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-indexflow-primary to-indexflow-secondary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indexflow-primary/30 disabled:opacity-50"
            >
              {isBusy && pendingAction === "stake" ? "Processing..." : "Stake"}
            </button>
          </form>

          <form onSubmit={unstakeForm.handleSubmit(handleAction("unstake"))} className="card space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Unstake</h3>
              <p className="text-sm text-white/60">Withdraw staked tokens back to your wallet after the lock period.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase text-white/50">Amount</label>
              <input
                type="number"
                step="0.0001"
                inputMode="decimal"
                {...unstakeForm.register("amount")}
                className="w-full rounded-xl border border-white/10 bg-black/60 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indexflow-secondary"
                placeholder="0.0"
              />
              {unstakeForm.formState.errors.amount && (
                <p className="text-xs text-indexflow-accent">{unstakeForm.formState.errors.amount.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center rounded-full border border-indexflow-secondary px-5 py-3 text-sm font-semibold text-indexflow-secondary hover:bg-indexflow-secondary/10 disabled:opacity-50"
            >
              {isBusy && pendingAction === "unstake" ? "Processing..." : "Unstake"}
            </button>
          </form>
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={claimRewards}
            disabled={isBusy}
            className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
          >
            {isBusy && pendingAction === "claim" ? "Processing..." : "Claim rewards"}
          </button>
        </div>
      </div>
    </section>
  );
}
