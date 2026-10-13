import { ArrowUpRight, ShieldCheck } from 'lucide-react';

import PolicySimulator from '@/src/components/PolicySimulator';

const PolicyKitPage = () => (
  <div className="space-y-6">
    <header className="flex flex-col gap-5 rounded-3xl border border-border/70 bg-card/90 p-6 shadow-card ring-1 ring-white/5 sm:flex-row sm:items-end sm:justify-between sm:p-8">
      <div className="space-y-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          <ShieldCheck size={15} /> Policy evaluation
        </p>
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">PolicyKit Playground</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-300">
          Simulate an agent transaction against contract, value, proof, reputation, and Sybil-risk
          rules.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-xs text-slate-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        Backend check
        <ArrowUpRight size={14} className="text-slate-500" />
        <span className="font-mono text-slate-200">/api/v1/sybil/check</span>
      </div>
    </header>
    <PolicySimulator />
  </div>
);

export default PolicyKitPage;