'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { apiFetch } from '@/lib/apiClient';

interface ProtocolParameters {
  baseReward: number;
  challengeBond: number;
  validatorQuorum: number;
  slashPercentage: number;
}

interface ProtocolParametersResponse extends ProtocolParameters {
  updatedAt: string;
}

interface OracleResponse {
  oracleUrl: string;
  updatedAt: string;
}

const defaultParameters: ProtocolParameters = {
  baseReward: 150,
  challengeBond: 500,
  validatorQuorum: 0.67,
  slashPercentage: 0.25
};

const governanceProposals = [
  {
    id: 'proposal-17',
    title: 'Increase active validator task bonus to 12%',
    status: 'Active',
    quorum: '45%',
    eta: '2025-10-20'
  },
  {
    id: 'proposal-16',
    title: 'Add IPFS pinning subsidy pool',
    status: 'Succeeded',
    quorum: '58%',
    eta: '2025-09-14'
  }
];

export function AdminDashboard() {
  const [parameters, setParameters] = useState<ProtocolParameters>(defaultParameters);
  const [parametersUpdatedAt, setParametersUpdatedAt] = useState<string | null>(null);
  const [oracleUrl, setOracleUrl] = useState('https://oracle.indexflow.network');
  const [oracleUpdatedAt, setOracleUpdatedAt] = useState<string | null>(null);
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const adminHeaders = useMemo(() => {
    if (!address) return undefined;
    return {
      'x-admin-wallet': address.toLowerCase()
    };
  }, [address]);

  const adminKey = adminHeaders?.['x-admin-wallet'];

  const parametersQuery = useQuery({
    queryKey: ['admin-parameters', adminKey],
    queryFn: async () =>
      apiFetch<ProtocolParametersResponse>('/admin/parameters', {
        headers: {
          'Content-Type': 'application/json',
          ...(adminHeaders ?? {})
        }
      }),
    enabled: Boolean(adminHeaders)
  });

  const oracleQuery = useQuery({
    queryKey: ['admin-oracle', adminKey],
    queryFn: async () =>
      apiFetch<OracleResponse>('/admin/oracle', {
        headers: {
          'Content-Type': 'application/json',
          ...(adminHeaders ?? {})
        }
      }),
    enabled: Boolean(adminHeaders)
  });

  const parameterLoadError = parametersQuery.isError
    ? parametersQuery.error instanceof Error
      ? parametersQuery.error.message
      : 'Failed to load protocol parameters.'
    : null;

  const oracleLoadError = oracleQuery.isError
    ? oracleQuery.error instanceof Error
      ? oracleQuery.error.message
      : 'Failed to load oracle endpoint.'
    : null;

  useEffect(() => {
    if (parametersQuery.data) {
      const { baseReward, challengeBond, validatorQuorum, slashPercentage, updatedAt } =
        parametersQuery.data;
      setParameters({ baseReward, challengeBond, validatorQuorum, slashPercentage });
      setParametersUpdatedAt(updatedAt);
    }
  }, [parametersQuery.data]);

  useEffect(() => {
    if (oracleQuery.data) {
      const { oracleUrl: url, updatedAt } = oracleQuery.data;
      setOracleUrl(url);
      setOracleUpdatedAt(updatedAt);
    }
  }, [oracleQuery.data]);

  const parameterMutation = useMutation<ProtocolParametersResponse, Error, ProtocolParameters>({
    mutationFn: async (payload) => {
      if (!adminHeaders) {
        throw new Error('Connect with an authorized admin wallet.');
      }
      const isValid = [
        payload.baseReward,
        payload.challengeBond,
        payload.validatorQuorum,
        payload.slashPercentage
      ].every((value) => Number.isFinite(value));

      if (!isValid) {
        throw new Error('Enter valid numeric values for all parameters before saving.');
      }
      return apiFetch<ProtocolParametersResponse>('/admin/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminHeaders ?? {})
        },
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (result) => {
      setParameters({
        baseReward: result.baseReward,
        challengeBond: result.challengeBond,
        validatorQuorum: result.validatorQuorum,
        slashPercentage: result.slashPercentage
      });
      setParametersUpdatedAt(result.updatedAt);
      if (adminKey) {
        queryClient.invalidateQueries({ queryKey: ['admin-parameters', adminKey] });
      }
      toast.success('Protocol parameters updated.');
    },
    onError: (error) => toast.error(error.message)
  });

  const oracleMutation = useMutation<OracleResponse, Error, string>({
    mutationFn: async (url) => {
      if (!adminHeaders) {
        throw new Error('Connect with an authorized admin wallet.');
      }
      return apiFetch<OracleResponse>('/admin/oracle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminHeaders ?? {})
        },
        body: JSON.stringify({ url })
      });
    },
    onSuccess: (result) => {
      setOracleUrl(result.oracleUrl);
      setOracleUpdatedAt(result.updatedAt);
      if (adminKey) {
        queryClient.invalidateQueries({ queryKey: ['admin-oracle', adminKey] });
      }
      toast.success('Oracle endpoint updated.');
    },
    onError: (error) => toast.error(error.message)
  });

  const disableParameters = parameterMutation.isPending;
  const disableOracle = oracleMutation.isPending;

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-xl font-semibold text-white">Protocol Parameters</h2>
        <p className="mt-2 text-sm text-white/60">
          Adjust base incentives and security thresholds. Updates require DAO approval before
          execution.
        </p>
        {parametersUpdatedAt && (
          <p className="mt-2 text-xs text-white/50">
            Last updated {new Date(parametersUpdatedAt).toLocaleString()}
          </p>
        )}
        {parametersQuery.isLoading && (
          <p className="mt-2 text-xs text-white/50">Loading latest parameters…</p>
        )}
        {parameterLoadError && (
          <p className="mt-2 text-xs text-red-400">{parameterLoadError}</p>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <NumberControl
            label="Base Reward (IFLW)"
            value={parameters.baseReward}
            onChange={(value) => setParameters((prev) => ({ ...prev, baseReward: value }))}
            disabled={disableParameters}
          />
          <NumberControl
            label="Challenge Bond (IFLW)"
            value={parameters.challengeBond}
            onChange={(value) => setParameters((prev) => ({ ...prev, challengeBond: value }))}
            disabled={disableParameters}
          />
          <NumberControl
            label="Validator Quorum"
            value={parameters.validatorQuorum}
            step={0.01}
            onChange={(value) => setParameters((prev) => ({ ...prev, validatorQuorum: value }))}
            disabled={disableParameters}
          />
          <NumberControl
            label="Slash Percentage"
            value={parameters.slashPercentage}
            step={0.01}
            onChange={(value) => setParameters((prev) => ({ ...prev, slashPercentage: value }))}
            disabled={disableParameters}
          />
        </div>
        <Button
          className="mt-6"
          loading={parameterMutation.isPending}
          disabled={disableParameters}
          onClick={() => parameterMutation.mutate({ ...parameters })}
        >
          {parameterMutation.isPending ? 'Submitting...' : 'Queue Parameter Update'}
        </Button>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Oracle Endpoint</h2>
          <Button
            variant="secondary"
            loading={oracleMutation.isPending}
            disabled={disableOracle}
            onClick={() => oracleMutation.mutate(oracleUrl)}
          >
            Sync Oracle
          </Button>
        </div>
        <input
          value={oracleUrl}
          onChange={(event) => setOracleUrl(event.target.value)}
          disabled={disableOracle}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
        />
        {oracleUpdatedAt && (
          <p className="text-xs text-white/50">
            Last updated {new Date(oracleUpdatedAt).toLocaleString()}
          </p>
        )}
        {oracleQuery.isLoading && (
          <p className="text-xs text-white/50">Loading oracle endpoint…</p>
        )}
        {oracleLoadError && <p className="text-xs text-red-400">{oracleLoadError}</p>}
        <p className="text-xs text-white/60">
          Oracle nodes publish Proof of SQL attestations and reference data for off-chain datasets.
        </p>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-white">Governance Proposals</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {governanceProposals.map((proposal) => (
            <div key={proposal.id} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs uppercase text-white/40">{proposal.id}</p>
              <p className="mt-1 text-sm font-semibold text-white">{proposal.title}</p>
              <p className="mt-2 text-xs text-white/60">Status: {proposal.status}</p>
              <p className="text-xs text-white/60">Quorum: {proposal.quorum}</p>
              <p className="text-xs text-white/60">ETA: {proposal.eta}</p>
              <Button className="mt-3 w-full" variant="ghost">
                View on Snapshot
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

interface NumberControlProps {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function NumberControl({ label, value, step = 1, onChange, disabled = false }: NumberControlProps) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
      />
    </label>
  );
}
