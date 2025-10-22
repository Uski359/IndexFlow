import { CuratorDashboard } from '@/components/curate/CuratorDashboard';
import { Card } from '@/components/ui/Card';

export default function CuratePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Curator Tasks</h1>
        <p className="max-w-2xl text-sm text-white/60">
          Validators stake IFLW to verify queries, attest Proof of SQL results, and protect the
          network through the challenge mechanism.
        </p>
      </header>

      <CuratorDashboard />

      <Card>
        <h2 className="text-lg font-semibold text-white">Slashing Rules</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-white/60">
          <li>Missed deadlines reduce validator reputation multiplier.</li>
          <li>Malicious attestations burn bonded stake and redirect portions to challengers.</li>
          <li>DAO can freeze validators across all subgraphs after repeated offenses.</li>
        </ul>
      </Card>
    </div>
  );
}
