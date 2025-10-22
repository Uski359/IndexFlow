'use client';

import clsx from 'clsx';

import { dayjs } from '@/lib/dayjs';
import { useProtocolHealth } from '@/hooks/useProtocolHealth';

export function ProtocolStatusBadge() {
  const { data, isFetching, isError } = useProtocolHealth();

  const status = data?.status ?? 'unknown';
  const lastUpdated = data?.timestamp ? dayjs(data.timestamp) : null;
  const isHealthy = status === 'ok' && !isError;
  const relativeTime = lastUpdated ? lastUpdated.fromNow(true) : 'unknown';

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70">
      <span
        className={clsx(
          'h-2 w-2 rounded-full',
          isHealthy ? 'bg-success animate-pulse' : 'bg-danger'
        )}
        aria-hidden
      />
      <span className="hidden sm:inline">
        {isHealthy ? `Validators synced - ${relativeTime} ago` : 'Validator sync degraded'}
      </span>
      <span className="sm:hidden">{isHealthy ? 'Synced' : 'Degraded'}</span>
      {isFetching && <span className="hidden text-white/40 sm:inline">refreshing...</span>}
    </div>
  );
}
