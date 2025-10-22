'use client';

import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAccount, useChainId, usePublicClient, useWalletClient, useWriteContract } from 'wagmi';
import type { Address } from 'viem';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/apiClient';
import {
  INDEXFLOW_DATA_ABI,
  INDEXFLOW_DATA_ADDRESS
} from '@/lib/contracts';
import { DataEntry } from '@/types/protocol';

interface ProofSubmissionFormProps {
  dataset: DataEntry;
  onSubmitted: () => Promise<void> | void;
  onCancel: () => void;
}

const HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

export function ProofSubmissionForm({ dataset, onSubmitted, onCancel }: ProofSubmissionFormProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const initialQuality = useMemo(
    () => Math.min(100, Math.max(0, Math.round((dataset.qualityScore ?? 0) * 100) || 85)),
    [dataset.qualityScore]
  );

  const [contractDatasetId, setContractDatasetId] = useState<string>(
    dataset.metadata.contractDatasetId ? String(dataset.metadata.contractDatasetId) : ''
  );
  const [poiHash, setPoiHash] = useState('');
  const [sqlHash, setSqlHash] = useState(dataset.sqlHash ?? '');
  const [qualityScore, setQualityScore] = useState<number>(initialQuality);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!address) {
      toast.error('Connect your wallet before submitting proofs.');
      return;
    }

    const expectedChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '11155111');
    if (chainId != null && chainId !== expectedChainId) {
      toast.error('Switch to the supported network before submitting proofs.');
      return;
    }

    if (!publicClient) {
      toast.error('No public RPC client available.');
      return;
    }

    if (!walletClient) {
      toast.error('Wallet client not available. Reconnect your wallet and try again.');
      return;
    }

    if (!INDEXFLOW_DATA_ADDRESS || INDEXFLOW_DATA_ADDRESS === '0x0000000000000000000000000000000000000000') {
      toast.error('IndexFlowData contract address is not configured.');
      return;
    }

    const datasetIdNumeric = Number(contractDatasetId);
    if (!Number.isInteger(datasetIdNumeric) || datasetIdNumeric <= 0) {
      toast.error('Contract dataset ID must be a positive integer.');
      return;
    }

    const normalizedPoi = poiHash.trim().toLowerCase();
    const normalizedSql = sqlHash.trim().toLowerCase();

    if (!HASH_REGEX.test(normalizedPoi)) {
      toast.error('POI hash must be a 32-byte hex string.');
      return;
    }

    if (!HASH_REGEX.test(normalizedSql)) {
      toast.error('SQL hash must be a 32-byte hex string.');
      return;
    }

    if (qualityScore < 0 || qualityScore > 100) {
      toast.error('Quality score must be between 0 and 100.');
      return;
    }

    try {
      setIsSubmitting(true);

      const txHash = await writeContractAsync({
        address: INDEXFLOW_DATA_ADDRESS,
        abi: INDEXFLOW_DATA_ABI,
        functionName: 'recordProof',
        args: [
          BigInt(datasetIdNumeric),
          normalizedPoi as `0x${string}`,
          normalizedSql as `0x${string}`,
          Number(qualityScore)
        ]
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.success('Proof submitted on-chain.');

      const callbackPayload = {
        entryId: dataset.id,
        verifier: address,
        verdict: 'approved' as const,
        qualityScore: Number(qualityScore) / 100,
        sqlHash: normalizedSql,
        poiHash: normalizedPoi,
        notes: notes.trim() || undefined
      };

      const message = JSON.stringify(callbackPayload);
      const signature = await walletClient.signMessage({
        account: address as Address,
        message
      });

      await apiFetch('/verify/callback', {
        method: 'POST',
        headers: {
          'x-validator-address': address,
          'x-validator-signature': signature
        },
        body: message
      });

      toast.success('Backend verification recorded.');
      await onSubmitted();
      onCancel();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit proof. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="space-y-4 border-white/20 bg-black/40 p-4">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
            Contract Dataset ID
            <input
              type="number"
              min={1}
              required
              value={contractDatasetId}
              onChange={(event) => setContractDatasetId(event.target.value)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
              placeholder="e.g. 42"
            />
          </label>

          <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
            Quality Score
            <input
              type="number"
              min={0}
              max={100}
              value={qualityScore}
              onChange={(event) => setQualityScore(Number(event.target.value))}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
              placeholder="0 - 100"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
          Proof of Indexing Hash
          <input
            value={poiHash}
            onChange={(event) => setPoiHash(event.target.value)}
            className="font-mono rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
            placeholder="0x..."
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
          Proof of SQL Hash
          <input
            value={sqlHash}
            onChange={(event) => setSqlHash(event.target.value)}
            className="font-mono rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
            placeholder="0x..."
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
            rows={3}
            placeholder="Additional context for fellow validators..."
          />
        </label>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Submitting Proof...' : 'Submit Proof'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
