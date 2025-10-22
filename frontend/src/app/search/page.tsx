import { SearchClient } from '@/components/search/SearchClient';
import { Card } from '@/components/ui/Card';

export default function SearchPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Semantic Search</h1>
        <p className="max-w-2xl text-sm text-white/60">
          Query the IndexFlow network using natural language. Proof of SQL guarantees query
          reproducibility, while ElasticSearch powers low-latency discovery.
        </p>
      </header>
      <SearchClient />
      <Card>
        <h2 className="text-lg font-semibold text-white">How it works</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-white/60">
          <li>Prompt is embedded and matched against curated dataset descriptors.</li>
          <li>Context is fed into our SQL co-pilot with validator-approved templates.</li>
          <li>
            Resulting SQL runs on decentralized IndexFlow nodes and streams back to the client.
          </li>
        </ol>
      </Card>
    </div>
  );
}
