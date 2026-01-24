'use client';

import { useState } from 'react';
import type { WalletRowWithInsights } from '@/lib/types';

type WalletTableProps = {
  results: WalletRowWithInsights[];
};

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const shortenWallet = (wallet: string) => {
  if (wallet.length <= 12) {
    return wallet;
  }
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
};

const shortenHash = (hash: string) => {
  if (hash.length <= 16) {
    return hash;
  }
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
};

const tagStyles: Record<WalletRowWithInsights['insights']['behavior_tag'], string> = {
  organic: 'bg-emerald-500/20 text-emerald-200',
  suspected_farm: 'bg-rose-500/20 text-rose-200',
  inactive: 'bg-slate-500/30 text-slate-200',
  mixed: 'bg-amber-500/20 text-amber-200'
};

const tagLabels: Record<WalletRowWithInsights['insights']['behavior_tag'], string> = {
  organic: 'Organic',
  suspected_farm: 'Suspected farm',
  inactive: 'Inactive',
  mixed: 'Mixed'
};

const WalletTable = ({ results }: WalletTableProps) => {
  const [selected, setSelected] = useState<WalletRowWithInsights | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!selected || !navigator?.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(selected.output.proof.canonical_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3">Verified usage</th>
              <th className="px-4 py-3">Tx count</th>
              <th className="px-4 py-3">Days active</th>
              <th className="px-4 py-3">Unique contracts</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Farm%</th>
              <th className="px-4 py-3">Tag</th>
              <th className="px-4 py-3">Cached</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {results.map((entry) => {
              const summary = entry.output.usage_summary;
              const verified = entry.output.verified_usage;
              return (
                <tr
                  key={entry.wallet}
                  onClick={() => {
                    setSelected(entry);
                    setCopied(false);
                  }}
                  className="cursor-pointer hover:bg-white/5"
                >
                  <td className="px-4 py-3 text-slate-100" title={entry.wallet}>
                    {shortenWallet(entry.wallet)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        verified
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-rose-500/20 text-rose-200'
                      }`}
                    >
                      {verified ? 'Verified' : 'Not verified'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatNumber(summary.tx_count)}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatNumber(summary.days_active)}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatNumber(summary.unique_contracts)}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatNumber(entry.insights.overall_score)}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {formatPercent(entry.insights.farming_probability)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                        tagStyles[entry.insights.behavior_tag]
                      }`}
                    >
                      {tagLabels[entry.insights.behavior_tag]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        title={entry.cached_core ? 'Core cached' : 'Core live'}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          entry.cached_core
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        Core
                      </span>
                      <span
                        title={entry.cached_insights ? 'Insights cached' : 'Insights live'}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          entry.cached_insights
                            ? 'bg-sky-500/20 text-sky-200'
                            : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        Insights
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950 p-6 text-slate-100 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wallet</p>
                <p className="mt-2 text-lg font-semibold" title={selected.wallet}>
                  {selected.wallet}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selected.output.verified_usage
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    {selected.output.verified_usage ? 'Verified usage' : 'Not verified'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>Cached</span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selected.cached_core
                        ? 'bg-sky-500/20 text-sky-200'
                        : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    Core
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      selected.cached_insights
                        ? 'bg-sky-500/20 text-sky-200'
                        : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    Insights
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tx count</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatNumber(selected.output.usage_summary.tx_count)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Days active</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatNumber(selected.output.usage_summary.days_active)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unique contracts</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatNumber(selected.output.usage_summary.unique_contracts)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatNumber(selected.insights.overall_score)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Farm %</p>
                <p className="mt-2 text-lg font-semibold">
                  {formatPercent(selected.insights.farming_probability)}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Tag</p>
                <p className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      tagStyles[selected.insights.behavior_tag]
                    }`}
                  >
                    {tagLabels[selected.insights.behavior_tag]}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Proof hash</p>
                  <p className="mt-2 font-mono text-sm text-slate-200" title={selected.output.proof.canonical_hash}>
                    {shortenHash(selected.output.proof.canonical_hash)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:text-white"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WalletTable;
