'use client';

import { useMemo, useState } from 'react';

import Card from '@/components/Card';

type ProofOfUsageResult = {
  wallet: string;
  protocol: string;
  chain: string;
  used: boolean;
  evidence: {
    contractInteractions: number;
    erc20Transfers: number;
    blocksScanned: number;
  };
  deterministicHash: string;
};

const CHAIN_OPTIONS = [
  {
    id: 11155111,
    name: 'sepolia',
    label: 'Sepolia'
  }
];

const buildApiUrl = () => {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  if (!base) {
    return '/api/proof-of-usage';
  }
  return `${base}/proof-of-usage`;
};

const ProofOfUsagePage = () => {
  const [wallet, setWallet] = useState('');
  const [contract, setContract] = useState('');
  const [chainId, setChainId] = useState(String(CHAIN_OPTIONS[0].id));
  const [fromBlock, setFromBlock] = useState('');
  const [toBlock, setToBlock] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProofOfUsageResult | null>(null);

  const apiUrl = useMemo(() => buildApiUrl(), []);

  const selectedChain =
    CHAIN_OPTIONS.find((option) => String(option.id) === chainId) ?? CHAIN_OPTIONS[0];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      wallet: wallet.trim(),
      protocol: {
        name: 'testnet-demo',
        contracts: [contract.trim()]
      },
      chain: {
        id: selectedChain.id,
        name: selectedChain.name
      },
      timeWindow: {
        fromBlock: Number(fromBlock),
        toBlock: Number(toBlock)
      }
    };

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = (await res.json().catch(() => null)) as ProofOfUsageResult | {
        error?: string;
      } | null;

      if (!res.ok) {
        setError(data?.error || 'Verification failed.');
        return;
      }

      setResult(data as ProofOfUsageResult);
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyHash = async () => {
    if (!result?.deterministicHash) return;
    try {
      await navigator.clipboard.writeText(result.deterministicHash);
    } catch {
      // Ignore copy failures.
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-white">Proof of Usage (Testnet)</h1>
          <span className="rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-amber-200">
            Testnet / Experimental
          </span>
        </div>
        <p className="text-sm text-gray-400">
          Verify deterministic usage evidence for a wallet across a block range.
        </p>
      </div>

      <Card
        title="Verification inputs"
        subtitle="Submit a deterministic proof-of-usage request"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-gray-400">
                Wallet address
              </label>
              <input
                type="text"
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                placeholder="0x..."
                required
                className="w-full rounded-lg border border-[#1f1f2a] bg-[#0d0d14] px-3 py-2 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-gray-400">
                Contract address
              </label>
              <input
                type="text"
                value={contract}
                onChange={(event) => setContract(event.target.value)}
                placeholder="0x..."
                required
                className="w-full rounded-lg border border-[#1f1f2a] bg-[#0d0d14] px-3 py-2 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/60"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-gray-400">
                Chain
              </label>
              <select
                value={chainId}
                onChange={(event) => setChainId(event.target.value)}
                className="w-full rounded-lg border border-[#1f1f2a] bg-[#0d0d14] px-3 py-2 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/60"
              >
                {CHAIN_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.12em] text-gray-400">
                  From block
                </label>
                <input
                  type="number"
                  min={0}
                  value={fromBlock}
                  onChange={(event) => setFromBlock(event.target.value)}
                  placeholder="0"
                  required
                  className="w-full rounded-lg border border-[#1f1f2a] bg-[#0d0d14] px-3 py-2 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/60"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.12em] text-gray-400">
                  To block
                </label>
                <input
                  type="number"
                  min={0}
                  value={toBlock}
                  onChange={(event) => setToBlock(event.target.value)}
                  placeholder="0"
                  required
                  className="w-full rounded-lg border border-[#1f1f2a] bg-[#0d0d14] px-3 py-2 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent/60"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Requests are evaluated on Sepolia testnet only.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-gray-600 disabled:text-gray-200"
            >
              {loading ? 'Verifying...' : 'Verify Usage'}
            </button>
          </div>
        </form>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {result && (
        <Card title="Verification result" subtitle="Deterministic proof-of-usage output">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-400">Used</p>
            <span
              className={
                result.used
                  ? 'rounded-full border border-emerald-400/60 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200'
                  : 'rounded-full border border-rose-400/60 bg-rose-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200'
              }
            >
              {result.used ? 'true' : 'false'}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-white/5 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-400">
                Contract interactions
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {result.evidence.contractInteractions}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-400">ERC-20 transfers</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {result.evidence.erc20Transfers}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-400">Blocks scanned</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {result.evidence.blocksScanned}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#1f1f2a] bg-[#0d0d14] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.12em] text-gray-400">
                Deterministic hash
              </p>
              <button
                type="button"
                onClick={handleCopyHash}
                className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-white hover:border-white/30"
              >
                Copy
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-sm text-white">
              {result.deterministicHash}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProofOfUsagePage;
