"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useMemo } from "react";
import { shortenAddress } from "@/lib/utils";

export function WalletButton() {
  const { address, status } = useAccount();
  const { connect, connectors, error, isLoading } = useConnect();
  const { disconnect } = useDisconnect();

  const primaryConnector = useMemo(() => connectors[0], [connectors]);

  const handleConnect = () => {
    if (!primaryConnector) return;
    connect({ connector: primaryConnector });
  };

  if (status === "connected" && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
      >
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="inline-flex items-center rounded-full bg-indexflow-secondary px-4 py-2 text-sm font-semibold text-white shadow shadow-indexflow-secondary/30 hover:shadow-lg disabled:opacity-60"
    >
      {isLoading ? "Connecting" : "Connect Wallet"}
      {error && <span className="ml-2 text-xs text-indexflow-accent">{error.message}</span>}
    </button>
  );
}
