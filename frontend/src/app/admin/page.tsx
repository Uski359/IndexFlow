'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';

import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Card } from '@/components/ui/Card';
import { isAdminAccount } from '@/lib/adminConfig';

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const authorized = isAdminAccount(address);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white">Checking wallet status…</h2>
        <p className="mt-2 text-sm text-white/60">Hang tight while we verify admin access.</p>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white">Wallet required</h2>
        <p className="mt-2 text-sm text-white/60">Connect with an authorized admin wallet to continue.</p>
      </Card>
    );
  }

  if (!authorized) {
    return (
      <Card>
        <h2 className="text-lg font-semibold text-white">Access denied</h2>
        <p className="mt-2 text-sm text-white/60">
          This wallet is not registered as an IndexFlow admin. Switch to an approved account to manage the protocol.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">DAO & Oracle Management</h1>
        <p className="max-w-2xl text-sm text-white/60">
          Coordinate protocol parameters, oracle endpoints, and governance proposals for IndexFlow.
        </p>
      </header>
      <AdminDashboard />
      <Card>
        <h2 className="text-lg font-semibold text-white">Admin Responsibilities</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/60">
          <li>Ensure oracle endpoints publish proofs within agreed latency windows.</li>
          <li>Monitor validator quorum and adjust challenge bonds to deter malicious activity.</li>
          <li>Coordinate DAO proposals and on-chain execution using the IndexFlowDAO contract.</li>
        </ul>
      </Card>
    </div>
  );
}
