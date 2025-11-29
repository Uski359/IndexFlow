"use client";

import { useCallback, useMemo } from "react";
import { Address, Hash, createPublicClient, http } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { chains } from "@/lib/wagmi";
import { stakingAbi } from "@/lib/contracts/stakingAbi";
import { env } from "@/lib/env";

type StakingContract = {
  contractAddress: Address;
  tokenAddress: Address;
  chainId: number;
  rpcUrl: string;
  contractConfig: { address: Address; abi: typeof stakingAbi; chainId: number };
  getUserStake: (user: Address) => Promise<bigint>;
  getTotalStaked: () => Promise<bigint>;
  stake: (amount: bigint) => Promise<Hash>;
  unstake: (amount: bigint) => Promise<Hash>;
};

export function useStakingContract(): StakingContract {
  const chainId = env.NEXT_PUBLIC_CHAIN_ID ?? 11155111;
  const rpcUrl =
    env.NEXT_PUBLIC_RPC_URL ?? "https://eth-sepolia.g.alchemy.com/v2/vtMDks-q4F59s_mGE9HGg";
  const contractAddress = env.NEXT_PUBLIC_STAKING_CONTRACT as Address;
  const tokenAddress = env.NEXT_PUBLIC_STAKE_TOKEN_ADDRESS as Address;

  const resolvedChain = useMemo(() => chains.find((item) => item.id === chainId) ?? chains[0], [chainId]);
  const wagmiClient = usePublicClient({ chainId: resolvedChain?.id });
  const { data: walletClient } = useWalletClient({ chainId: resolvedChain?.id });

  const readClient = useMemo(
    () =>
      wagmiClient ??
      createPublicClient({
        chain: resolvedChain,
        transport: http(rpcUrl)
      }),
    [resolvedChain, rpcUrl, wagmiClient]
  );

  const contractConfig = useMemo(
    () => ({
      address: contractAddress,
      abi: stakingAbi,
      chainId: resolvedChain?.id ?? chainId
    }),
    [contractAddress, chainId, resolvedChain]
  );

  const getUserStake = useCallback(
    async (user: Address) =>
      readClient.readContract({
        ...contractConfig,
        functionName: "balances",
        args: [user]
      }) as Promise<bigint>,
    [contractConfig, readClient]
  );

  const getTotalStaked = useCallback(
    async () =>
      readClient.readContract({
        ...contractConfig,
        functionName: "totalStaked"
      }) as Promise<bigint>,
    [contractConfig, readClient]
  );

  const stake = useCallback(
    async (amount: bigint) => {
      if (!walletClient) {
        throw new Error("Connect wallet to stake");
      }
      return walletClient.writeContract({
        ...contractConfig,
        functionName: "stake",
        args: [amount],
        account: walletClient.account
      });
    },
    [contractConfig, walletClient]
  );

  const unstake = useCallback(
    async (amount: bigint) => {
      if (!walletClient) {
        throw new Error("Connect wallet to unstake");
      }
      return walletClient.writeContract({
        ...contractConfig,
        functionName: "unstake",
        args: [amount],
        account: walletClient.account
      });
    },
    [contractConfig, walletClient]
  );

  return {
    contractAddress,
    tokenAddress,
    chainId: resolvedChain?.id ?? chainId,
    rpcUrl,
    contractConfig,
    getUserStake,
    getTotalStaked,
    stake,
    unstake
  };
}
