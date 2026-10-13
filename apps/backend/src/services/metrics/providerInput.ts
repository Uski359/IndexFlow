import { getAddress } from 'ethers';

import {
  getCampaign,
  getCampaignTargets
} from '../../config/campaignRegistry.js';
import type { GetWalletMetricsInput } from './IMetricsProvider.js';

const CHAIN_ID_ALIASES: Record<number, string> = {
  1: 'ethereum',
  10: 'optimism',
  56: 'bnb',
  137: 'polygon',
  42161: 'arbitrum',
  8453: 'base',
  11155111: 'sepolia'
};

const normalizeAddress = (value: string): string | null => {
  const candidate = value.trim();
  if (!candidate) {
    return null;
  }

  try {
    return getAddress(candidate).toLowerCase();
  } catch {
    return null;
  }
};

export const resolveChainAliases = (chainId: number): string[] => {
  const aliases = new Set<string>();
  aliases.add(String(chainId));

  const namedAlias = CHAIN_ID_ALIASES[chainId];
  if (namedAlias) {
    aliases.add(namedAlias);
  }

  return Array.from(aliases);
};

export const resolveWalletVariants = (wallet: string): string[] => {
  const normalized = normalizeAddress(wallet);
  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  variants.add(getAddress(normalized));
  return Array.from(variants);
};

export const resolveTargets = (input: GetWalletMetricsInput): string[] => {
  const sourceTargets =
    input.targets && input.targets.length > 0
      ? input.targets
      : getCampaignTargets(input.campaign_id);

  const normalizedTargets = new Set<string>();
  for (const target of sourceTargets) {
    const normalized = normalizeAddress(target);
    if (normalized) {
      normalizedTargets.add(normalized);
    }
  }

  return Array.from(normalizedTargets);
};

export const areTargetsErc20Tagged = (
  campaignId: string,
  targets: string[]
): boolean => {
  const campaign = getCampaign(campaignId);
  if (!campaign) {
    return false;
  }

  const targetToTags = new Map<string, Set<string>>();
  for (const target of campaign.targets) {
    const normalized = normalizeAddress(target.address);
    if (!normalized) {
      continue;
    }

    const tags = new Set((target.tags ?? []).map((tag) => tag.trim().toLowerCase()));
    targetToTags.set(normalized, tags);
  }

  return targets.every((target) => targetToTags.get(target)?.has('erc20') ?? false);
};

export const toUnixSeconds = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const truncated = Math.trunc(value);
  if (truncated > 100_000_000_000) {
    return Math.floor(truncated / 1_000);
  }
  return truncated;
};

export const toUnixMilliseconds = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const truncated = Math.trunc(value);
  if (truncated > 100_000_000_000) {
    return truncated;
  }
  return truncated * 1_000;
};
