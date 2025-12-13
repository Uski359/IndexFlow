"use client";

import { useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useNetwork, useSwitchNetwork } from "wagmi";
import { env } from "@/lib/env";

const REQUIRED_CHAIN_ID = env.NEXT_PUBLIC_CHAIN_ID ?? 11155111;

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork, isLoading: isSwitching } = useSwitchNetwork({
    chainId: REQUIRED_CHAIN_ID
  });

  const { connect, connectors, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const preferredConnector = useMemo(
    () => connectors.find((connector) => connector.ready) ?? connectors[0],
    [connectors]
  );

  const handleConnect = () => {
    if (!preferredConnector) return;
    connect({ connector: preferredConnector });
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={!preferredConnector || isConnecting}
        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (chain?.id !== REQUIRED_CHAIN_ID) {
    return (
      <button
        onClick={() => switchNetwork?.(REQUIRED_CHAIN_ID)}
        disabled={!switchNetwork || isSwitching}
        className="rounded-lg bg-yellow-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSwitching ? "Switching..." : "Switch to Sepolia"}
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700"
    >
      {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Disconnect"}
    </button>
  );
}
