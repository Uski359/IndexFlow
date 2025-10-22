import { Card } from '@/components/ui/Card';
import { RewardSummary } from '@/types/protocol';
import { dayjs } from '@/lib/dayjs';

interface RewardFormulaCardProps {
  summary?: RewardSummary;
}

export function RewardFormulaCard({ summary }: RewardFormulaCardProps) {
  const pending = summary?.pending ?? 0;
  const lifetime = summary?.lifetime ?? 0;
  const latest = summary?.latestDistributions ?? [];

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm uppercase text-white/60">Reward Overview</p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          IndexFlowR distributions are tracked from on-chain data.
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Metric label="Pending Rewards" value={`${pending.toFixed(2)} IndexFlowR`} highlight />
        <Metric label="Lifetime Distributed" value={`${lifetime.toFixed(2)} IndexFlowR`} />
      </div>

      <div className="space-y-2">
        <p className="text-xs uppercase text-white/50">Recent Distributions</p>
        {latest.length === 0 ? (
          <p className="text-sm text-white/60">No reward records yet.</p>
        ) : (
          <ul className="space-y-2 text-sm text-white/70">
            {latest.slice(0, 4).map((distribution) => (
              <li
                key={`${distribution.datasetId}-${distribution.timestamp}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              >
                <span>{distribution.datasetId}</span>
                <span className="text-white">
                  {distribution.amount.toFixed(2)} IndexFlowR - {dayjs(distribution.timestamp).fromNow()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

interface MetricProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function Metric({ label, value, highlight }: MetricProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs uppercase text-white/50">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${highlight ? 'text-brand' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}
