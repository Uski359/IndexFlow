"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { formatEther } from "viem";
import { print } from "graphql";
import { env } from "@/lib/env";
import { DemoPageDocument, type DemoPageQuery } from "@/lib/graphql/generated/graphql";
import { WalletButton } from "@/components/common/WalletButton";
import { StakingOverview } from "@/components/dashboard/StakingOverview";
import { useStakingContract } from "@/lib/hooks/useStakingContract";

type GraphQLErrorItem = {
  message?: string;
  extensions?: {
    code?: string;
    field?: string;
  };
};

const DEMO_QUERY = print(DemoPageDocument);

const endpoint = env.NEXT_PUBLIC_INDEX_NODE_URL;

async function fetchDemoData(limit: number): Promise<DemoPageQuery> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: DEMO_QUERY, variables: { limit } })
  });

  if (!response.ok) {
    throw new Error(`Index node returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    const first: GraphQLErrorItem = payload.errors[0];
    const code = first.extensions?.code ? `[${first.extensions.code}] ` : "";
    throw new Error(`${code}${first.message ?? "GraphQL error"}`);
  }

  return payload.data as DemoPageQuery;
}

function shortenAddress(address: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatValue(value: string) {
  try {
    const parsed = Number(formatEther(BigInt(value)));
    return `${parsed.toLocaleString(undefined, { maximumFractionDigits: 4 })} IFLW`;
  } catch {
    return value;
  }
}

function LoadingBar() {
  return <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />;
}

export default function DemoPage() {
  const transferLimit = 8;
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["demo-data", transferLimit, endpoint],
    queryFn: () => fetchDemoData(transferLimit),
    refetchInterval: 10000,
    staleTime: 5000
  });

  const { contractAddress, tokenAddress, chainId: stakingChainId } = useStakingContract();

  const latestBlock = data?.latestBlock;
  const transfers = data?.transfers?.items ?? [];
  const apiStatusText = useMemo(() => {
    if (isError) {
      const message = error instanceof Error ? error.message : "GraphQL error";
      return `GraphQL error: ${message}`;
    }
    return "GraphQL OK";
  }, [error, isError]);

  const subtitle = useMemo(() => {
    if (!latestBlock) return "Live Sepolia data pulled directly from the index-node.";
    return `Live Sepolia data — chainId ${latestBlock.chainId}`;
  }, [latestBlock]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B0D12] to-[#05060d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="badge bg-white/10 text-xs uppercase text-white/70">Demo</div>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">IndexFlow testnet demo</h1>
            <p className="mt-2 text-white/70">{subtitle}</p>
            <a
              href="https://github.com/indexflow-labs/index-node"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
            >
              Powered by IndexFlow index-node (Sepolia)
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${
                isError ? "bg-red-500/15 text-red-100" : "bg-emerald-500/15 text-emerald-100"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isError ? "bg-red-400" : "bg-emerald-400"
                }`}
              />
              <span className="line-clamp-1 max-w-xs">{apiStatusText}</span>
            </div>
          </div>
          <WalletButton />
        </header>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="card">
            <p className="text-sm text-white/60">Latest block</p>
            <div className="mt-3 text-3xl font-semibold text-white">
              {isLoading ? <LoadingBar /> : latestBlock ? latestBlock.number.toLocaleString() : "—"}
            </div>
            <p className="mt-1 text-xs text-white/50">{endpoint}</p>
          </div>
          <div className="card">
            <p className="text-sm text-white/60">Chain ID</p>
            <div className="mt-3 text-2xl font-semibold text-white">
              {isLoading ? <LoadingBar /> : latestBlock?.chainId ?? "—"}
            </div>
            <p className="mt-1 text-xs text-white/50">Configured via env vars</p>
          </div>
          <div className="card">
            <p className="text-sm text-white/60">Refresh</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-white">
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Auto-refreshing every 10s
            </div>
            <p className="mt-1 text-xs text-white/50">Last fetch {isFetching ? "..." : "ready"}</p>
          </div>
          <div className="card">
            <p className="text-sm text-white/60">Active contracts</p>
            <p className="mt-2 text-xs text-white/60">Staking: <span className="text-white">{contractAddress}</span></p>
            <p className="text-xs text-white/60">Token: <span className="text-white">{tokenAddress}</span></p>
            <p className="mt-2 text-xs text-white/50">Chain ID in UI: {stakingChainId}</p>
          </div>
        </section>

        <section className="mt-8">
          <div className="card overflow-hidden">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Recent transfers</h2>
                <p className="text-sm text-white/60">Showing the latest {transferLimit} ERC-20 transfers</p>
              </div>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white hover:border-white/30"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {isError ? (
              <div className="rounded-2xl border border-indexflow-accent/40 bg-indexflow-accent/10 px-4 py-6 text-sm text-indexflow-accent">
                {error instanceof Error ? error.message : "Unable to load data from index-node."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-white/80">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/50">
                    <tr>
                      <th className="px-4 py-3">From</th>
                      <th className="px-4 py-3">To</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3 text-right">Block</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading &&
                      Array.from({ length: transferLimit }).map((_, index) => (
                        <tr key={index} className="border-t border-white/5">
                          <td className="px-4 py-3" colSpan={4}>
                            <LoadingBar />
                          </td>
                        </tr>
                      ))}
                    {!isLoading && transfers.length === 0 && (
                      <tr className="border-t border-white/5">
                        <td className="px-4 py-6 text-center text-white/60" colSpan={4}>
                          No transfers indexed yet.
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      transfers.map((transfer) => (
                        <tr key={transfer.id} className="border-t border-white/5">
                          <td className="px-4 py-3 font-medium text-white">{shortenAddress(transfer.from)}</td>
                          <td className="px-4 py-3 font-medium text-white">{shortenAddress(transfer.to)}</td>
                          <td className="px-4 py-3 text-indexflow-secondary">{formatValue(transfer.value)}</td>
                          <td className="px-4 py-3 text-right text-white/70">#{transfer.blockNumber.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Staking (disabled)</h2>
            <p className="text-sm text-white/60">Staking actions are currently disabled in this demo build.</p>
          </div>
          <StakingOverview />
          {/* StakingActions temporarily disabled */}
        </section>
      </div>
    </div>
  );
}
