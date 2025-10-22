import { Card } from '@/components/ui/Card';

const apiOperations = [
  {
    method: 'GET',
    path: '/api/data',
    description: 'List datasets currently registered in IndexFlow.',
    sampleResponse: { items: [] }
  },
  {
    method: 'POST',
    path: '/api/data/submit',
    description: 'Submit a dataset for indexing and validation.',
    sampleResponse: {
      id: 'dataset-123',
      status: 'pending',
      stakeRequired: 0,
      estimatedReward: 0
    }
  },
  {
    method: 'GET',
    path: '/api/stake',
    description: 'Return current staking positions recorded by the backend service.',
    sampleResponse: { items: [] }
  },
  {
    method: 'POST',
    path: '/api/stake',
    description: 'Create a staking position (server-authorised flows).',
    sampleResponse: {
      success: true,
      position: {
        id: 'stake-id',
        amount: 0,
        apy: 0,
        lockUntil: '2024-01-01T00:00:00.000Z',
        rewardsToClaim: 0,
        type: 'passive'
      }
    }
  },
  {
    method: 'GET',
    path: '/api/rewards',
    description: 'Fetch pending and lifetime reward metrics for a wallet.',
    sampleResponse: {
      address: '0x...',
      pending: 0,
      lifetime: 0,
      latestDistributions: []
    }
  }
];

export default function ApiDocsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">API Reference</h1>
        <p className="max-w-3xl text-sm text-white/60">
          Interact with IndexFlow using REST and GraphQL endpoints. Each request is signed and
          anchored to Proof of Indexing checkpoints for verifiable results.
        </p>
      </header>

      <Card>
        <h2 className="text-xl font-semibold text-white">REST Endpoints</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/70">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Method</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Path</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                  Sample Response
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {apiOperations.map((operation) => (
                <tr key={operation.path} className="align-top hover:bg-white/5">
                  <td className="px-4 py-3 text-white">
                    <span className="rounded-lg bg-white/10 px-3 py-1 font-semibold text-white">
                      {operation.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand">{operation.path}</td>
                  <td className="px-4 py-3 text-white/70">{operation.description}</td>
                  <td className="px-4 py-3 text-xs text-white/50">
                    <pre className="max-h-48 overflow-auto rounded-xl bg-black/40 p-3 text-xs">
                      {JSON.stringify(operation.sampleResponse, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-white">GraphQL</h2>
        <p className="mt-2 text-sm text-white/60">
          Query normalized indexes directly from IndexFlow GraphQL gateway. All responses are signed
          with validator attestations.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-white/40">Query</p>
            <pre className="mt-2 h-full overflow-auto rounded-xl bg-black/40 p-4 text-xs text-white/70">
{`query DatasetByHash($hash: String!) {
  dataset(hash: $hash) {
    id
    status
    metadata {
      name
      tags
    }
    reward
    latestCheckpoint {
      blockNumber
      poiHash
    }
  }
}`}
            </pre>
          </div>
          <div>
            <p className="text-xs uppercase text-white/40">Variables</p>
            <pre className="mt-2 rounded-xl bg-black/40 p-4 text-xs text-white/70">
{`{
  "hash": "0xabc123"
}`}
            </pre>
            <p className="mt-4 text-xs text-white/50">
              Include `x-iflw-signature` header signed with your validator key for privileged fields.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
