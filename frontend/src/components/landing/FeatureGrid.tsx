import { DatabaseZap, ShieldCheck, Network, Clock, Cpu, BarChart3 } from "lucide-react";

const features = [
  {
    title: "Deterministic indexing",
    description: "Batch-based pipeline with safe block confirmations and automated reorg healing.",
    icon: ShieldCheck
  },
  {
    title: "Proof of SQL",
    description: "Queries ship with verifiable attestations backed by Merkle commitments for every dataset.",
    icon: DatabaseZap
  },
  {
    title: "Liquidity-aware staking",
    description: "Stakers earn IFLW rewards streamed per batch with transparent PoI submissions.",
    icon: BarChart3
  },
  {
    title: "Multichain ready",
    description: "Sepolia today, modular expansion to any EVM L2 or appchain tomorrow.",
    icon: Network
  },
  {
    title: "Realtime dashboards",
    description: "IndexFlow Studio offers live introspection with metrics, alerts, and validator controls.",
    icon: Clock
  },
  {
    title: "Zero-trust delivery",
    description: "Clients consume data through signed responses and rate-limited endpoints by default.",
    icon: Cpu
  }
];

export function FeatureGrid() {
  return (
    <section id="features" className="section-spacing">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Purpose-built for verifiable data delivery</h2>
          <p className="mt-4 text-lg text-white/70">
            IndexFlow orchestrates a hybrid proof system that keeps your on-chain analytics fresh, consistent, and
            provably correct.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="card h-full">
              <feature.icon className="h-10 w-10 text-indexflow-secondary" />
              <h3 className="mt-4 text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm text-white/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
