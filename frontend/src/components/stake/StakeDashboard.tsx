'use client';

import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { parseUnits } from 'viem';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { dayjs } from '@/lib/dayjs';
import {
  REWARD_TOKEN_ADDRESS,
  STAKE_CONTRACT_ABI,
  STAKE_CONTRACT_ADDRESS,
  STAKE_TOKEN_ABI,
  STAKE_TOKEN_ADDRESS,
  STAKE_TOKEN_DECIMALS
} from '@/lib/contracts';
import { apiFetch } from '@/lib/apiClient';
import { useRewardSummary, useStakes } from '@/hooks/useApiData';
import { StakePosition } from '@/types/protocol';

interface StakePayload {
  address?: string;
  amount: number;
  stakeType: StakePosition['type'];
  lockDays: number;
}

interface UnstakePayload {
  stakeId: string;
}

export function StakeDashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const stakesQuery = useStakes(address);
  const summaryQuery = useRewardSummary(address);

  const fetchedPositions = useMemo<StakePosition[]>(
    () => stakesQuery.data ?? [],
    [stakesQuery.data]
  );
  const summary = summaryQuery.data;

  const { isLoading: isStakesLoading, isError: isStakesError, error: stakesError, refetch } =
    stakesQuery;
  const {
    isError: isSummaryError,
    error: summaryError,
    refetch: refetchSummary
  } = summaryQuery;

  const [positions, setPositions] = useState<StakePosition[]>([]);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [stakeType, setStakeType] = useState<StakePosition['type']>('passive');
  const [lockDays, setLockDays] = useState(30);
  const [selectedStakeId, setSelectedStakeId] = useState<string | undefined>();
  const [isProcessingStake, setIsProcessingStake] = useState(false);
  const [isProcessingUnstake, setIsProcessingUnstake] = useState(false);
  const [isProcessingClaim, setIsProcessingClaim] = useState(false);
  const isDisconnected = !isConnected || !address;
  const stakesErrorMessage =
    stakesError instanceof Error ? stakesError.message : 'Failed to load staking positions.';
  const summaryErrorMessage =
    summaryError instanceof Error ? summaryError.message : 'Failed to load reward summary.';

  useEffect(() => {
    if (isStakesError) {
      return;
    }
    setPositions(fetchedPositions);
  }, [fetchedPositions, isStakesError]);

  useEffect(() => {
    if (positions.length === 0) {
      setSelectedStakeId(undefined);
      return;
    }
    if (!selectedStakeId || !positions.some((stake) => stake.id === selectedStakeId)) {
      setSelectedStakeId(positions[0].id);
    }
  }, [positions, selectedStakeId]);

  const totals = useMemo(() => {
    const totalStaked = positions.reduce((acc, stake) => acc + stake.amount, 0);
    const weightedApy =
      totalStaked === 0
        ? 0
        : positions.reduce((acc, stake) => acc + stake.apy * stake.amount, 0) / totalStaked;
    const nextUnlock = positions
      .map((stake) => stake.lockUntil)
      .filter(Boolean)
      .sort()[0];
    return {
      totalStaked,
      weightedApy,
      nextUnlock
    };
  }, [positions]);

  if (isDisconnected) {
    return (
      <Card>
        <p className="text-sm text-white/70">Connect your wallet to manage staking positions.</p>
      </Card>
    );
  }

  const handleStake = async (payload: StakePayload) => {
    if (!address) {
      toast.error('Connect your wallet before staking.');
      return;
    }
    if (!publicClient) {
      toast.error('No public client available.');
      return;
    }
    if (!payload.amount || Number(payload.amount) <= 0) {
      toast.error('Enter an amount greater than zero.');
      return;
    }

    const amountWei = parseUnits(payload.amount.toString(), STAKE_TOKEN_DECIMALS);
    const lockDurationSeconds = BigInt(payload.lockDays) * 86_400n;
    const stakeMode = payload.stakeType === 'active' ? 1 : 0;

    try {
      setIsProcessingStake(true);

      const approveHash = await writeContractAsync({
        address: STAKE_TOKEN_ADDRESS,
        abi: STAKE_TOKEN_ABI,
        functionName: 'approve',
        args: [STAKE_CONTRACT_ADDRESS, amountWei]
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      const stakeHash = await writeContractAsync({
        address: STAKE_CONTRACT_ADDRESS,
        abi: STAKE_CONTRACT_ABI,
        functionName: 'stake',
        args: [amountWei, lockDurationSeconds, stakeMode]
      });
      await publicClient.waitForTransactionReceipt({ hash: stakeHash });

      toast.success('Stake transaction confirmed on-chain.');

      const createdPosition = await apiFetch<StakePosition>('/stake', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          address
        })
      });

      setSelectedStakeId(createdPosition.id);
      setStakeAmount(0);
      await Promise.all([refetch(), refetchSummary()]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Stake request could not be processed.'
      );
    } finally {
      setIsProcessingStake(false);
    }
  };

  const handleUnstake = async (payload: UnstakePayload) => {
    if (!address) {
      toast.error('Connect your wallet before unstaking.');
      return;
    }
    if (!publicClient) {
      toast.error('No public client available.');
      return;
    }

    const position = positions.find((stake) => stake.id === payload.stakeId);
    if (!position) {
      toast.error('Selected stake not found.');
      return;
    }

    const amountWei = parseUnits(position.amount.toString(), STAKE_TOKEN_DECIMALS);

    try {
      setIsProcessingUnstake(true);

      const txHash = await writeContractAsync({
        address: STAKE_CONTRACT_ADDRESS,
        abi: STAKE_CONTRACT_ABI,
        functionName: 'unstake',
        args: [amountWei]
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      toast.success('Unstake transaction confirmed.');

      await apiFetch('/stake/unstake', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      await Promise.all([refetch(), refetchSummary()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unstake request failed.');
    } finally {
      setIsProcessingUnstake(false);
    }
  };

  const handleClaimRewards = async () => {
    if (!address) {
      toast.error('Connect your wallet before claiming.');
      return;
    }
    if (!publicClient) {
      toast.error('No public client available.');
      return;
    }
    const pendingAmount = summary?.pending ?? 0;
    if (pendingAmount <= 0) {
      toast('No rewards available to claim right now.', { icon: 'â„¹ï¸' });
      return;
    }

    try {
      setIsProcessingClaim(true);

      const claimHash = await writeContractAsync({
        address: STAKE_CONTRACT_ADDRESS,
        abi: STAKE_CONTRACT_ABI,
        functionName: 'claimRewards',
        args: []
      });

      await publicClient.waitForTransactionReceipt({ hash: claimHash });
      toast.success('Rewards claimed on-chain.');

      await apiFetch('/rewards/claim', {
        method: 'POST',
        body: JSON.stringify({
          address
        })
      });

      await Promise.all([refetch(), refetchSummary()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim rewards.');
    } finally {
      setIsProcessingClaim(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-6 md:grid-cols-3">
        <SummaryCard label="Total Staked" value={`${totals.totalStaked.toLocaleString()} IndexFlowT`} />
        <SummaryCard label="Blended APY" value={`${(totals.weightedApy * 100).toFixed(2)}%`} />
        <SummaryCard
          label="Next Unlock"
          value={totals.nextUnlock ? dayjs(totals.nextUnlock).fromNow() : 'No lockups'}
        />
      </section>

      <Card className="space-y-2 text-xs text-white/70">
        <p className="text-sm font-semibold text-white">On-chain Addresses</p>
        <AddressRow label="Stake Token (IndexFlowT)" value={STAKE_TOKEN_ADDRESS} />
        <AddressRow label="Reward Token (IndexFlowR)" value={REWARD_TOKEN_ADDRESS} />
        <AddressRow label="Stake Contract" value={STAKE_CONTRACT_ADDRESS} />
        {isSummaryError && (
          <p className="text-xs text-danger">{summaryErrorMessage}</p>
        )}
        {summary && !isSummaryError && (
          <p className="text-xs text-white/60">
            Pending rewards: {summary.pending.toFixed(2)} IndexFlowR
          </p>
        )}
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Stake IndexFlowT</h2>
            <p className="text-sm text-white/60">
              Bond IndexFlowT to earn yield and become eligible for active validation tasks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setStakeType('passive')}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                stakeType === 'passive'
                  ? 'border-brand bg-brand/20 text-white'
                  : 'border-white/10 bg-black/30 text-white/60 hover:text-white'
              }`}
            >
              <p className="text-sm font-semibold">Passive Staking</p>
              <p className="text-xs text-white/50">Predictable yields</p>
            </button>
            <button
              type="button"
              onClick={() => setStakeType('active')}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                stakeType === 'active'
                  ? 'border-brand bg-brand/20 text-white'
                  : 'border-white/10 bg-black/30 text-white/60 hover:text-white'
              }`}
            >
              <p className="text-sm font-semibold">Active Staking</p>
              <p className="text-xs text-white/50">Run verification tasks</p>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
                Amount (IndexFlowT)
                <input
                  type="number"
                  min={0}
                  value={stakeAmount}
                  onChange={(event) => setStakeAmount(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </label>
            </div>
            <div>
              <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
                Lock Duration
                <select
                  value={lockDays}
                  onChange={(event) => setLockDays(Number(event.target.value))}
                  className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
                >
                  {[7, 30, 90, 180].map((days) => (
                    <option className="bg-[#0f0f1a]" key={days} value={days}>
                      {days} days
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/70">
            <p>
              <span className="text-white/40">Projected APY:</span>{' '}
              <strong className="text-white">
                {(calculateProjectedApy(stakeType, lockDays) * 100).toFixed(2)}%
              </strong>
            </p>
            <p className="mt-1">
              <span className="text-white/40">Projected Rewards (12m):</span>{' '}
              <strong className="text-white">
                {(stakeAmount * calculateProjectedApy(stakeType, lockDays)).toFixed(0)} IndexFlowR
              </strong>
            </p>
          </div>

          <Button
            onClick={() =>
              handleStake({
                amount: stakeAmount,
                stakeType,
                lockDays
              })
            }
            loading={isProcessingStake}
          >
            {isProcessingStake ? 'Staking...' : 'Confirm Stake'}
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Claim & Unstake</h2>
          <p className="text-sm text-white/60">
            Unlock matured stakes or exit early with proportional slashing protection.
          </p>
          <label className="flex flex-col gap-2 text-sm font-medium text-white/80">
            Select stake
            <select
              value={selectedStakeId ?? ''}
              onChange={(event) => setSelectedStakeId(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/50"
            >
              <option value="" disabled className="bg-[#0f0f1a] text-white/40">
                Choose a position
              </option>
              {positions.map((position) => (
                <option className="bg-[#0f0f1a]" value={position.id} key={position.id}>
                  {position.type.toUpperCase()} - {position.amount} IndexFlowT - unlocks{' '}
                  {dayjs(position.lockUntil).format('DD MMM')}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="secondary"
            loading={isProcessingUnstake}
            onClick={() => {
              if (!selectedStakeId) return toast.error('Select a position first');
              handleUnstake({ stakeId: selectedStakeId });
            }}
          >
            {isProcessingUnstake ? 'Submitting...' : 'Request Unstake'}
          </Button>
          <Button
            variant="secondary"
            loading={isProcessingClaim}
            disabled={isProcessingClaim || (summary?.pending ?? 0) <= 0}
            onClick={handleClaimRewards}
          >
            {isProcessingClaim ? 'Claiming...' : 'Claim Rewards'}
          </Button>
        </Card>
      </section>

      <Card>
        <h2 className="text-lg font-semibold text-white">Stake Positions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm text-white/70">
            <thead className="text-white/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">Amount</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">APY</th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                  Rewards
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                  Lock until
                </th>
                <th className="px-4 py-3 text-left font-medium uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isStakesError ? (
                <tr>
                  <td className="px-4 py-6 text-center text-danger" colSpan={6}>
                    {stakesErrorMessage}
                  </td>
                </tr>
              ) : isStakesLoading ? (
                <tr>
                  <td className="px-4 py-6 text-center text-white/50" colSpan={6}>
                    Loading stake data...
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-white/50" colSpan={6}>
                    No staking positions found yet.
                  </td>
                </tr>
              ) : (
                positions.map((position) => (
                  <tr key={position.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Badge variant={position.type === 'active' ? 'success' : 'neutral'}>
                        {position.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-white">
                      {position.amount.toLocaleString()} IndexFlowT
                    </td>
                    <td className="px-4 py-3 text-white">
                      {(position.apy * 100).toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-white">
                      {position.rewardsToClaim.toLocaleString()} IndexFlowR
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {dayjs(position.lockUntil).format('DD MMM YYYY')}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={dayjs(position.lockUntil).isBefore(dayjs()) ? 'success' : 'neutral'}>
                        {dayjs(position.lockUntil).isBefore(dayjs()) ? 'Unlockable' : 'Locked'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs uppercase text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </Card>
  );
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-white/10 bg-black/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-white/60">{label}</span>
      <code className="overflow-hidden text-ellipsis whitespace-nowrap text-white/80">
        {value}
      </code>
    </div>
  );
}

function calculateProjectedApy(type: StakePosition['type'], lockDays: number) {
  const base = type === 'active' ? 0.18 : 0.12;
  const lockBonus = Math.min(lockDays / 365, 0.5) * (type === 'active' ? 0.14 : 0.1);
  const total = base + lockBonus;
  return Math.min(total, type === 'active' ? 0.32 : 0.22);
}


