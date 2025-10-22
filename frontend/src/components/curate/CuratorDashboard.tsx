'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dayjs } from '@/lib/dayjs';
import { useChallenges, useDatasets } from '@/hooks/useApiData';
import { ProofSubmissionForm } from '@/components/curate/ProofSubmissionForm';
import type { Challenge, DataEntry } from '@/types/protocol';

export function CuratorDashboard() {
  const datasetsQuery = useDatasets();
  const challengesQuery = useChallenges();
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  const datasets = useMemo<DataEntry[]>(() => datasetsQuery.data ?? [], [datasetsQuery.data]);
  const challenges = useMemo<Challenge[]>(() => challengesQuery.data ?? [], [challengesQuery.data]);

  const { isLoading: isDatasetsLoading, isError: isDatasetsError, error: datasetsError, refetch: refetchDatasets } = datasetsQuery;
  const { isLoading: isChallengesLoading, isError: isChallengesError, error: challengesError } = challengesQuery;

  const pendingDatasets = useMemo(
    () => datasets.filter((dataset) => dataset.status === 'pending'),
    [datasets]
  );

  const datasetById = useMemo(
    () => new Map(datasets.map((dataset) => [dataset.id, dataset])),
    [datasets]
  );

  const datasetsErrorMessage =
    datasetsError instanceof Error ? datasetsError.message : 'Failed to load datasets.';
  const challengesErrorMessage =
    challengesError instanceof Error ? challengesError.message : 'Failed to load challenges.';

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-xl font-semibold text-white">Active Verification Tasks</h2>
        <p className="mt-2 text-sm text-white/60">
          Datasets with a pending status still require a validator decision. The list below
          reflects the state stored by the backend.
        </p>

        <div className="mt-6 space-y-4">
          {isDatasetsError ? (
            <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6 text-sm text-danger">
              {datasetsErrorMessage}
            </div>
          ) : isDatasetsLoading ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/60">
              Loading datasets...
            </div>
          ) : pendingDatasets.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-white/60">
              No datasets require validation right now.
            </div>
          ) : (
            pendingDatasets.map((dataset) => (
              <div
                key={dataset.id}
                className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{dataset.metadata.name}</h3>
                  <p className="text-sm text-white/60">{dataset.metadata.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-white/50">
                    <span>Size: {dataset.metadata.sizeInMb} MB</span>
                    <span>Reward: {dataset.reward} IndexFlowR</span>
                    <span>Updated: {dayjs(dataset.updatedAt).fromNow()}</span>
                    <span>Quality: {(dataset.qualityScore * 100).toFixed(1)}%</span>
                  </div>
                  <Badge variant="warning">pending</Badge>
                </div>
                <div className="flex flex-col gap-3 lg:w-64">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setActiveDatasetId((current) => (current === dataset.id ? null : dataset.id))
                    }
                  >
                    {activeDatasetId === dataset.id ? 'Close Proof Form' : 'Submit Proof'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      navigator.clipboard.writeText(dataset.hash).catch(() => undefined)
                    }
                  >
                    Copy Hash
                  </Button>
                </div>
                {activeDatasetId === dataset.id && (
                  <ProofSubmissionForm
                    dataset={dataset}
                    onCancel={() => setActiveDatasetId(null)}
                    onSubmitted={async () => {
                      await refetchDatasets();
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Challenge History</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/70">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                  Dataset
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                  Challenger
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Bond</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isChallengesError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-danger" colSpan={5}>
                    {challengesErrorMessage}
                  </td>
                </tr>
              ) : isChallengesLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-white/50" colSpan={5}>
                    Loading challenge entries...
                  </td>
                </tr>
              ) : challenges.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-white/50" colSpan={5}>
                    No challenge entries recorded yet.
                  </td>
                </tr>
              ) : (
                challenges.map((challenge) => {
                  const dataset = datasetById.get(challenge.entryId);
                  return (
                    <tr key={challenge.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-white">
                        {dataset ? dataset.metadata.name : challenge.entryId}
                      </td>
                      <td className="px-4 py-3 text-white/80">{challenge.challenger}</td>
                      <td className="px-4 py-3 text-white">{challenge.bond} IndexFlowT</td>
                      <td className="px-4 py-3">
                        <Badge variant={challenge.status === 'won' ? 'success' : 'warning'}>
                          {challenge.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {dayjs(challenge.openedAt).fromNow()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


