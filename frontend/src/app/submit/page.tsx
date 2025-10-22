import { Card } from '@/components/ui/Card';
import { SubmitForm } from '@/components/submit/SubmitForm';

export default function SubmitDataPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Submit Data</h1>
        <p className="max-w-2xl text-sm text-white/60">
          Upload structured datasets or attach SQL schemas to feed the IndexFlow network. Earn IFLW
          tokens through Proof of Indexing checkpoints and curator reviews.
        </p>
      </header>

      <SubmitForm />

      <Card>
        <h2 className="text-lg font-semibold text-white">Submission Tiers</h2>
        <ul className="mt-3 grid gap-4 text-sm text-white/60 md:grid-cols-3">
          <li>
            <span className="font-semibold text-white">Community Tier:</span> Lightweight datasets,
            open review, 5-day activation.
          </li>
          <li>
            <span className="font-semibold text-white">Curator Tier:</span> Requires active stake,
            fast-track with bonded validators.
          </li>
          <li>
            <span className="font-semibold text-white">DAO Tier:</span> Strategic datasets approved
            by governance with boosted rewards.
          </li>
        </ul>
      </Card>
    </div>
  );
}
