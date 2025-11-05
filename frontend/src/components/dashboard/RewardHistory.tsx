const history = [
  { batch: "sepolia:120-132", rewards: 320.45, timestamp: "2 hours ago" },
  { batch: "sepolia:108-120", rewards: 298.12, timestamp: "1 day ago" },
  { batch: "sepolia:96-108", rewards: 270.78, timestamp: "2 days ago" }
];

export function RewardHistory() {
  return (
    <section className="section-spacing">
      <div className="mx-auto max-w-4xl px-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-white">Recent reward batches</h3>
          <p className="mt-1 text-sm text-white/60">Live data becomes available after your wallet indexes its first batch.</p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-white/5">
            <table className="w-full text-sm text-white/70">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Rewards</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.batch} className="border-t border-white/5">
                    <td className="px-4 py-3 text-white">{row.batch}</td>
                    <td className="px-4 py-3 text-indexflow-secondary">{row.rewards.toLocaleString()} IFLW</td>
                    <td className="px-4 py-3">{row.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
