const allocations = [
  { label: "DAO Treasury", percentage: 35, description: "Funding community grants, audits, and ecosystem ops." },
  { label: "Community Rewards", percentage: 25, description: "Liquidity mining, validator subsidies, and partner incentives." },
  { label: "Founding Team", percentage: 15, description: "4-year vesting with 6-month cliff via FoundersVesting." },
  { label: "Ecosystem Reserve", percentage: 15, description: "Strategic listings, institutional onboarding, emergency buffer." },
  { label: "Airdrop & Growth", percentage: 10, description: "Retroactive rewards for early delegators and data curators." }
];

export function Tokenomics() {
  return (
    <section id="tokenomics" className="section-spacing">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Tokenomics</h2>
          <p className="mt-3 text-lg text-white/70">The IFLW supply is capped at 1 billion tokens with aligned incentives for the protocol.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-sm uppercase tracking-wide text-white/60">Supply chart</h3>
            <div className="mt-6 space-y-4">
              {allocations.map((allocation) => (
                <div key={allocation.label}>
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <span>{allocation.label}</span>
                    <span>{allocation.percentage}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-indexflow-primary to-indexflow-secondary"
                      style={{ width: `${allocation.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            {allocations.map((allocation) => (
              <div key={allocation.label} className="card">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>{allocation.label}</span>
                  <span className="text-white font-medium">{allocation.percentage}%</span>
                </div>
                <p className="mt-2 text-sm text-white/70">{allocation.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
