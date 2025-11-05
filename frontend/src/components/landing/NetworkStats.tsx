"use client";

import { useEffect, useState } from "react";
import { env } from "@/lib/env";

interface StatsState {
  lastIndexedBlock: number;
  safeBlockNumber: number;
  totalTransfers: number;
  totalTransactions: number;
  poiLeafCount: number;
}

const defaultStats: StatsState = {
  lastIndexedBlock: 0,
  safeBlockNumber: 0,
  totalTransfers: 0,
  totalTransactions: 0,
  poiLeafCount: 0
};

export function NetworkStats() {
  const [stats, setStats] = useState<StatsState>(defaultStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        const response = await fetch(env.NEXT_PUBLIC_INDEX_NODE_URL, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query LandingStats {
                health {
                  lastIndexedBlock
                  safeBlockNumber
                }
                batches: indexedBatches(limit: 1) {
                  totalTransfers
                  totalTransactions
                  poiLeafCount
                }
              }
            `
          })
        });

        if (!response.ok) throw new Error("Failed to fetch stats");
        const json = await response.json();
        const health = json.data?.health;
        const batch = json.data?.batches?.[0];
        setStats({
          lastIndexedBlock: health?.lastIndexedBlock ?? 0,
          safeBlockNumber: health?.safeBlockNumber ?? 0,
          totalTransfers: batch?.totalTransfers ?? 0,
          totalTransactions: batch?.totalTransactions ?? 0,
          poiLeafCount: batch?.poiLeafCount ?? 0
        });
      } catch (error) {
        console.warn("Failed to load network stats", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    return () => controller.abort();
  }, []);

  return (
    <div className="card grid gap-6 sm:grid-cols-3">
      <StatBox
        label="Latest indexed block"
        value={loading ? "—" : stats.lastIndexedBlock.toLocaleString()}
        helper={`Safe block: ${stats.safeBlockNumber}`}
      />
      <StatBox
        label="Transfers in last batch"
        value={loading ? "—" : stats.totalTransfers.toLocaleString()}
        helper={`Proof leaves: ${stats.poiLeafCount}`}
      />
      <StatBox
        label="Transactions processed"
        value={loading ? "—" : stats.totalTransactions.toLocaleString()}
        helper="Across all indexed batches"
      />
    </div>
  );
}

interface StatBoxProps {
  label: string;
  value: string;
  helper?: string;
}

function StatBox({ label, value, helper }: StatBoxProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/60">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      {helper && <p className="text-xs text-white/40">{helper}</p>}
    </div>
  );
}
