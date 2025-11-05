"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-24 pt-28">
      <div className="absolute inset-0 bg-grid" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-indexflow-primary/30 to-transparent blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 text-center">
        <span className="badge">
          <span className="inline-flex h-2 w-2 rounded-full bg-indexflow-accent" />
          IndexFlow Protocol
        </span>
        <h1 className="text-balance text-4xl font-semibold text-white sm:text-5xl md:text-6xl">
          Real-time indexing with verifiable integrity for modern web3 apps
        </h1>
        <p className="text-balance text-lg text-white/70 md:text-xl">
          Combine Proof of Indexing with Proof of SQL for transparent data supply. Stake your IFLW, index trusted data,
          and serve verifiable queries to any application.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-indexflow-primary to-indexflow-secondary px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indexflow-primary/30 hover:shadow-xl"
          >
            Launch dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-white/80 hover:text-white"
          >
            Explore live demo
          </Link>
        </div>
        <div className="mt-12 grid w-full gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur">
          <p className="text-sm uppercase tracking-widest text-white/60">Network metrics</p>
          <dl className="grid grid-cols-1 gap-4 text-white sm:grid-cols-3">
            <div>
              <dt className="text-sm text-white/60">Validators</dt>
              <dd className="text-2xl font-semibold">128</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Daily proofs</dt>
              <dd className="text-2xl font-semibold">3.4K</dd>
            </div>
            <div>
              <dt className="text-sm text-white/60">Query latency</dt>
              <dd className="text-2xl font-semibold">&lt;180ms</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
