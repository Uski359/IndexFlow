'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dayjs } from '@/lib/dayjs';
import { useChallenges, useDatasets, useRewardSummary, useStakes } from '@/hooks/useApiData';
import type { Challenge, DataEntry, StakePosition } from '@/types/protocol';

export function ProfileDashboard() {
  const { address, isConnected } = useAccount();
  const loweredAddress = address?.toLowerCase() ?? '';

  const stakesQuery = useStakes(address);
  const rewardSummaryQuery = useRewardSummary(address);
  const datasetsQuery = useDatasets();
  const challengesQuery = useChallenges();

  const stakes = useMemo<StakePosition[]>(() => stakesQuery.data ?? [], [stakesQuery.data]);
  const rewardSummary = rewardSummaryQuery.data;
  const datasets = useMemo<DataEntry[]>(() => datasetsQuery.data ?? [], [datasetsQuery.data]);
  const challenges = useMemo<Challenge[]>(() => challengesQuery.data ?? [], [challengesQuery.data]);

  const { isLoading: isStakesLoading } = stakesQuery;
  const { isLoading: isDatasetsLoading } = datasetsQuery;

  const ownedDatasets = useMemo(
    () => datasets.filter((dataset) => dataset.submitter.toLowerCase() === loweredAddress),
    [datasets, loweredAddress]
  );

  const pendingChallenges = useMemo(
    () =>
      challenges.filter(
        (challenge) =>
          challenge.challenger.toLowerCase() === loweredAddress && challenge.status === 'pending'
      ),
    [challenges, loweredAddress]
  );

  const totalStaked = stakes.reduce((acc, stake) => acc + stake.amount, 0);
  const pendingRewards = rewardSummary?.pending ?? 0;
  const lifetimeRewards = rewardSummary?.lifetime ?? 0;

  if (!isConnected || !address) {
    return (
      <Card>
        <p className="text-sm text-white/70">Connect your wallet to see profile statistics.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase text-white/50">Connected Wallet</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{address}</h2>
            <p className="mt-1 text-xs text-white/50">
              Validation and staking activity is tracked against this address.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <SummaryStat label="Total Staked" value={`${totalStaked.toLocaleString()} IndexFlowT`} />
            <SummaryStat label="Pending" value={`${pendingRewards.toFixed(2)} IndexFlowR`} />
            <SummaryStat label="Lifetime" value={`${lifetimeRewards.toFixed(2)} IndexFlowR`} />
          </div>
        </div>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Rewards</h3>
              <p className="text-sm text-white/60">On-chain reward claiming is coming soon.</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => toast('On-chain claim functionality is coming soon.', { icon: '??' })}
              disabled
            >
              Claim
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-white">Verification Summary</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <span className="text-white/40">Datasets Submitted:</span> {ownedDatasets.length}
            </li>
            <li>
              <span className="text-white/40">Active Challenges:</span> {pendingChallenges.length}
            </li>
            <li>
              <span className="text-white/40">Completed Tasks:</span> 0
            </li>
          </ul>
        </Card>
      </section>

      <Card>
        <h3 className="text-lg font-semibold text-white">My Datasets</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {isDatasetsLoading ? (
            <p className="text-sm text-white/60">Loading datasets...</p>
          ) : ownedDatasets.length === 0 ? (
            <p className="text-sm text-white/60">No datasets submitted with this wallet yet.</p>
          ) : (
            ownedDatasets.map((dataset) => (
              <div
                key={dataset.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70"
              >
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-white">{dataset.metadata.name}</p>
                  <Badge variant={statusVariant(dataset.status)}>{dataset.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-white/50">{dataset.metadata.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/40">
                  {dataset.metadata.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-2 py-1">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/60">
                  <p>
                    Reward: <span className="text-white">{dataset.reward} IndexFlowR</span>
                  </p>
                  <p>
                    Updated: <span className="text-white">{dayjs(dataset.updatedAt).fromNow()}</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-white">Stake Positions</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/70">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">APY</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Lock</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Rewards</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isStakesLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-white/50" colSpan={5}>
                    Loading stake data...
                  </td>
                </tr>
              ) : stakes.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-white/50" colSpan={5}>
                    No active staking positions yet.
                  </td>
                </tr>
              ) : (
                stakes.map((stake) => (
                  <tr key={stake.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{stake.type.toUpperCase()}</td>
                    <td className="px-4 py-3 text-white">{stake.amount.toLocaleString()} IndexFlowT</td>
                    <td className="px-4 py-3 text-white">{(stake.apy * 100).toFixed(2)}%</td>
                    <td className="px-4 py-3 text-white/60">
                      {dayjs(stake.lockUntil).format('DD MMM YYYY')}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {stake.rewardsToClaim.toLocaleString()} IndexFlowR
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-xs uppercase text-white/50">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'indexed':
      return 'success';
    case 'pending':
      return 'warning';
    case 'challenged':
      return 'danger';
    default:
      return 'neutral';
  }
}


