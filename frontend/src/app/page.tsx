'use client';

import { useMemo } from 'react';

import { RewardFormulaCard } from '@/components/cards/RewardFormulaCard';
import { StatGrid } from '@/components/cards/StatGrid';
import { DataEntry, StakePosition } from '@/types/protocol';
import { DatasetTable } from '@/components/data/DatasetTable';
import { Hero } from '@/components/home/Hero';
import { Card } from '@/components/ui/Card';
import { useDatasets, useRewardSummary, useStakes } from '@/hooks/useApiData';

export default function HomePage() {
  const datasetsQuery = useDatasets();
  const stakesQuery = useStakes();
  const rewardSummaryQuery = useRewardSummary();

  const datasets = useMemo<DataEntry[]>(() => datasetsQuery.data ?? [], [datasetsQuery.data]);
  const stakes = useMemo<StakePosition[]>(() => stakesQuery.data ?? [], [stakesQuery.data]);
  const rewardSummary = rewardSummaryQuery.data;
  const { isLoading: isDatasetsLoading } = datasetsQuery;

  const stats = useMemo(() => {
    const indexed = datasets.filter((dataset) => dataset.status === 'indexed').length;
    const challenged = datasets.filter((dataset) => dataset.status === 'challenged').length;

    return [
      {
        label: 'Datasets',
        value: datasets.length.toString(),
        delta: '',
        trend: 'up' as const
      },
      {
        label: 'Indexed',
        value: indexed.toString(),
        delta: '',
        trend: 'up' as const
      },
      {
        label: 'Challenges',
        value: challenged.toString(),
        delta: '',
        trend: 'up' as const
      },
      {
        label: 'Active Stakes',
        value: stakes.length.toString(),
        delta: '',
        trend: 'up' as const
      }
    ];
  }, [datasets, stakes]);

  return (
    <div className="space-y-12">
      <Hero />

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Network Health</h2>
          <p className="text-sm text-white/60">
            Live metrics are derived from on-chain checkpoints and submitted datasets.
          </p>
        </div>
        <StatGrid stats={stats} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <h3 className="text-xl font-semibold text-white">Datasets</h3>
          <p className="mt-2 text-sm text-white/60">
            On-chain and off-chain datasets are submitted by the community and indexed after
            validation.
          </p>
          <div className="mt-6">
            <DatasetTable
              datasets={datasets}
              isLoading={isDatasetsLoading}
              emptyMessage="No datasets have been published yet."
            />
          </div>
        </Card>
        <RewardFormulaCard summary={rewardSummary} />
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <h3 className="text-lg font-semibold text-white">Share-to-Earn</h3>
          <p className="mt-3 text-sm text-white/60">
            Earn IndexFlowR rewards once your datasets are verified.
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-white">Stake-to-Verify</h3>
          <p className="mt-3 text-sm text-white/60">
            Validators stake IndexFlowT to take on tasks and collect IndexFlowR rewards.
          </p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold text-white">Challenge Layer</h3>
          <p className="mt-3 text-sm text-white/60">
            Any inconsistent result can be challenged transparently and resolved through the DAO.
          </p>
        </Card>
      </section>
    </div>
  );
}




