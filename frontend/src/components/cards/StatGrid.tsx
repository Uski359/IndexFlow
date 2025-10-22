import { Card } from '@/components/ui/Card';

interface Stat {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
}

interface StatGridProps {
  stats: Stat[];
}

export function StatGrid({ stats }: StatGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase text-white/50"> {stat.label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            </div>
            <span
              className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                stat.trend === 'up' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
              }`}
            >
              {stat.delta}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
