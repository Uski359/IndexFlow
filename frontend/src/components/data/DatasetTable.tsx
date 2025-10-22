import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { dayjs } from '@/lib/dayjs';
import { DataEntry } from '@/types/protocol';

interface DatasetTableProps {
  datasets: DataEntry[];
  compact?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DatasetTable({
  datasets,
  compact,
  isLoading,
  emptyMessage = 'No records to display.'
}: DatasetTableProps) {
  if (isLoading) {
    return (
      <Card padded={!compact}>
        <p className="text-sm text-white/60">Loading datasets...</p>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Dataset</th>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Tags</th>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Reward</th>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Quality</th>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Stake Boost</th>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Updated</th>
              <th className="px-6 py-3 text-left font-semibold uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {datasets.length === 0 ? (
              <tr>
                <td className="px-6 py-8 text-center text-white/50" colSpan={7}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              datasets.map((dataset) => (
                <tr key={dataset.id} className="hover:bg-white/5">
                  <td className="px-6 py-4 align-top">
                    <p className="font-semibold text-white">{dataset.metadata.name}</p>
                    <p className="mt-1 text-xs text-white/50">{dataset.metadata.description}</p>
                    <p className="mt-1 text-xs text-white/40">Hash: {dataset.hash}</p>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      {dataset.metadata.tags.map((tag) => (
                        <Badge key={tag} variant="neutral">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">{dataset.reward} IndexFlowR</td>
                  <td className="px-6 py-4 align-top">{(dataset.qualityScore * 100).toFixed(1)}%</td>
                  <td className="px-6 py-4 align-top">
                    {(dataset.stakeBoost * dataset.reputationMultiplier).toFixed(2)}x
                  </td>
                  <td className="px-6 py-4 align-top">{dayjs(dataset.updatedAt).fromNow()}</td>
                  <td className="px-6 py-4 align-top">
                    <Badge variant={statusVariant(dataset.status)}>{dataset.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function statusVariant(status: DataEntry['status']) {
  switch (status) {
    case 'indexed':
      return 'success';
    case 'pending':
      return 'neutral';
    case 'challenged':
      return 'warning';
    case 'rejected':
    case 'archived':
      return 'danger';
    default:
      return 'neutral';
  }
}
