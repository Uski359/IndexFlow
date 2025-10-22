'use client';

import { Card } from '@/components/ui/Card';
import { StakeDashboard } from '@/components/stake/StakeDashboard';

export default function StakePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Stake IFLW</h1>
        <p className="max-w-2xl text-sm text-white/60">
          Lock IFLW to secure the IndexFlow protocol. Choose between passive liquidity provisioning
          or active validation duties with Stake-to-Verify incentives.
        </p>
      </header>

      <StakeDashboard />

      <Card>
        <h2 className="text-lg font-semibold text-white">Dual Staking Mechanics</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/60">
          <li>
            <span className="text-white">Passive Staking:</span> Liquidity providers backstop reward
            pools and earn predictable yields.
          </li>
          <li>
            <span className="text-white">Active Staking:</span> Validators bond IFLW, run verification
            jobs, and receive task bonuses with slashing protection.
          </li>
          <li>
            <span className="text-white">Challenge Safety:</span> All stakes can be challenged via the
            dispute system to maintain data integrity.
          </li>
        </ul>
      </Card>
    </div>
  );
}

