'use client';

import { useState } from 'react';

type ProofOfUsageResponse = Record<string, unknown> | null;

const ProofOfUsagePage = () => {
  const [wallet, setWallet] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/proof-of-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim() })
      });

      const data = (await response.json().catch(() => null)) as ProofOfUsageResponse;

      if (!response.ok) {
        const message =
          data && typeof data === 'object' && 'error' in data
            ? String((data as { error: string }).error)
            : 'Request failed.';
        setError(message);
        return;
      }

      setResult(JSON.stringify(data ?? {}, null, 2));
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Deterministic Proof-of-Usage (Pilot)</h1>
      <p>Verify real protocol usage with explainable rules.</p>

      <form onSubmit={handleSubmit}>
        <label>
          Wallet address
          <input
            type="text"
            value={wallet}
            onChange={(event) => setWallet(event.target.value)}
            placeholder="0x..."
            required
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Checking...' : 'Check usage'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {result && <pre>{result}</pre>}
    </div>
  );
};

export default ProofOfUsagePage;
