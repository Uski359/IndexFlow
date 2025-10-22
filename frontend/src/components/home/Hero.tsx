import Link from 'next/link';

import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand/20 via-purple-500/10 to-blue-500/10 px-8 py-16 text-center md:text-left">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(111,91,255,0.45),_transparent_60%)]" />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs uppercase tracking-wide text-white/70">
            Introducing IndexFlow
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            Decentralized Indexing for on-chain and off-chain data.
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/70">
            IndexFlow combines Proof of Indexing, Proof of SQL, and tokenized incentives to power
            composable datasets across the decentralized web. Stake, validate, and monetize data with
            transparent cryptographic guarantees.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/submit">
              <Button className="w-full sm:w-auto">Submit Data</Button>
            </Link>
            <Link href="/search">
              <Button variant="secondary" className="w-full sm:w-auto">
                Explore Indexes
              </Button>
            </Link>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left text-sm text-white/80 shadow-glass">
          <p className="text-xs uppercase text-white/40">Live Snapshot</p>
          <ul className="mt-4 space-y-3">
            <Stat label="Datasets Indexed" value="1,248" />
            <Stat label="Validators Active" value="312" />
            <Stat label="TVL Secured" value="8.9M IFLW" />
            <Stat label="Rewards Distributed" value="12.4M IFLW" />
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-black/40 px-4 py-2">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </li>
  );
}
