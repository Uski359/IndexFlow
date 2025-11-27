'use client';

import { Users } from 'lucide-react';

import { useStats } from '@/hooks/useStats';

import Card from './Card';

const HolderStat = () => {
  const { holderCount, isLoading, error } = useStats();
  const total = holderCount?.totalHolders;

  const display =
    error ? 'Error' : isLoading ? '...' : total !== undefined ? total.toLocaleString() : '—';

  return (
    <Card title="Holders" subtitle="Unique addresses" className="h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-semibold tracking-tight text-white">{display}</p>
          <p className="text-sm text-gray-400">Across selected chain</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent">
          <Users size={22} />
        </div>
      </div>
    </Card>
  );
};

export default HolderStat;
