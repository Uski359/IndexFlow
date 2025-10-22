import type { Abi } from 'viem';

import indexFlowTokenAbi from '@/lib/ABI/IndexFlowT.json';
import rewardTokenAbi from '@/lib/ABI/IndexFlowR.json';
import indexFlowDataAbi from '@/lib/ABI/IndexFlowData.json';
import indexFlowDaoAbi from '@/lib/ABI/IndexFlowDAO.json';

function extractAbi(module: unknown): Abi {
  if (Array.isArray(module)) {
    return module as Abi;
  }
  if (module && typeof module === 'object' && 'abi' in module) {
    return (module as { abi: Abi }).abi;
  }
  throw new Error('Invalid ABI module - cannot extract ABI');
}

const chainIdEnv = process.env.NEXT_PUBLIC_CHAIN_ID;

export const CHAIN_ID = chainIdEnv ? Number(chainIdEnv) : 11155111;

export const STAKE_TOKEN_ADDRESS =
  (process.env.NEXT_PUBLIC_STAKE_TOKEN_ADDRESS as `0x${string}` | undefined) ??
  '0x063c40F24CE90d90de9f8F24c8c956B7194C29d4';

export const REWARD_TOKEN_ADDRESS =
  (process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS as `0x${string}` | undefined) ??
  '0x5baBb49be2E28801c5423D8698834dE1F98D3727';

export const STAKE_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_STAKE_CONTRACT_ADDRESS as `0x${string}` | undefined) ??
  '0x015c2d9bDeb027Fe9c0FC1D3206Ad4ee97359F79';

export const INDEXFLOW_TOKEN_ADDRESS =
  (process.env.NEXT_PUBLIC_INDEXFLOW_TOKEN_ADDRESS as `0x${string}` | undefined) ??
  STAKE_TOKEN_ADDRESS;

export const INDEXFLOW_DATA_ADDRESS =
  (process.env.NEXT_PUBLIC_INDEXFLOW_DATA_ADDRESS as `0x${string}` | undefined) ??
  '0x0000000000000000000000000000000000000000';

export const INDEXFLOW_DAO_ADDRESS =
  (process.env.NEXT_PUBLIC_INDEXFLOW_DAO_ADDRESS as `0x${string}` | undefined) ??
  '0x0000000000000000000000000000000000000000';

export const STAKE_TOKEN_DECIMALS = 18;
export const REWARD_TOKEN_DECIMALS = 18;

export const STAKE_TOKEN_ABI = extractAbi(indexFlowTokenAbi);
export const REWARD_TOKEN_ABI = extractAbi(rewardTokenAbi);
export const STAKE_CONTRACT_ABI = extractAbi(indexFlowTokenAbi);
export const INDEXFLOW_DATA_ABI = extractAbi(indexFlowDataAbi);
export const INDEXFLOW_DAO_ABI = extractAbi(indexFlowDaoAbi);
