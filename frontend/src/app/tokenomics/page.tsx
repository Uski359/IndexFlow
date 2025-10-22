import { Card } from '@/components/ui/Card';

const distribution = [
  { label: 'Community Rewards', percentage: 40, details: 'Liquidity mining, curation tasks, bounties' },
  { label: 'Validator Incentives', percentage: 22, details: 'Active stake rewards and verification bonuses' },
  { label: 'Foundation Treasury', percentage: 15, details: 'Protocol R&D, grants, ecosystem support' },
  { label: 'Team & Advisors', percentage: 10, details: '4-year vesting with 12-month cliff' },
  { label: 'Strategic Partners', percentage: 8, details: 'Data alliances, infrastructure providers' },
  { label: 'Public Sale', percentage: 5, details: 'Launch liquidity and community distribution' }
];

const rewardMultipliers = [
  { label: 'Quality Score', description: 'Validator-aggregated rating derived from Proof of SQL audit.' },
  { label: 'Reputation', description: 'Persistent contributor score weighted by successful submissions.' },
  { label: 'Stake Boost', description: 'Higher bonded stake unlocks fast-track indexing rewards.' },
  { label: 'Task Bonus', description: 'Extra yield for time-sensitive or complex verification jobs.' }
];

export default function TokenomicsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">IFLW Tokenomics</h1>
        <p className="max-w-3xl text-sm text-white/60">
          IFLW is the lifeblood of IndexFlow - powering staking, validation, challenges, and
          governance. Supply is fixed at 1 billion tokens with adaptive emission schedules tied to
          network growth.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-xl font-semibold text-white">Distribution</h2>
          <p className="mt-2 text-sm text-white/60">
            Emissions unlock gradually over a 6-year period to support sustainable growth, with a
            focus on community-driven indexing.
          </p>
          <div className="mt-6 space-y-3">
            {distribution.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-white/50">{item.details}</p>
                </div>
                <span className="text-lg font-semibold text-brand">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Emission Schedule</h2>
          <p className="text-sm text-white/60">
            IndexFlow uses a dynamic curve where community incentives taper as query volume and fees
            scale.
          </p>
          <ul className="space-y-2 text-sm text-white/70">
            <li>Years 1-2: Higher inflation to bootstrap validators and dataset contributors.</li>
            <li>Years 3-4: Emissions halve; network fees start recycling into reward pools.</li>
            <li>Years 5-6: As staking ratio stabilizes, DAO controls top-up distributions.</li>
          </ul>
        </Card>
      </section>

      <Card>
        <h2 className="text-xl font-semibold text-white">Reward Formula</h2>
        <p className="mt-2 text-sm text-white/60">
          Rewards align incentives across contributors, validators, and challengers. The composite
          multiplier ensures quality and accountability scale with the network.
        </p>
        <div className="mt-6 rounded-2xl border border-brand/40 bg-brand/10 px-6 py-8 text-center text-white">
          <p className="text-xs uppercase tracking-wide text-brand-light">Formula</p>
          <p className="mt-3 text-2xl font-semibold">
            Reward = BaseReward x QualityScore x Reputation x StakeBoost x TaskBonus
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rewardMultipliers.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="mt-2 text-xs text-white/60">{item.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
