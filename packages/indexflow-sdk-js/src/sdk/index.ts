import { Contract, JsonRpcProvider, formatUnits } from 'ethers';
import { randomUUID } from 'node:crypto';
import {
  appendProof,
  proofStore,
  generateMockProofs,
  type ProofData,
  type ProofOnChainSnapshot,
  type ProofStatus
} from '../../scripts/mockData.js';

const validatorRegistryAbi = [
  'function getValidator(address validator) view returns (tuple(address node,uint256 stake,bool active,uint256 lastProof))',
  'function validatorMetadata(address validator) view returns (string name, string endpoint)'
];

const stakingRewardsAbi = [
  'function previewReward(address validator) view returns (uint256)'
];

const rpcUrl = process.env.RPC_URL ?? 'https://ethereum.publicnode.com';
const provider = new JsonRpcProvider(rpcUrl);

function getValidatorRegistryContract() {
  const address = process.env.VALIDATOR_REGISTRY_ADDRESS;
  if (!address) {
    return null;
  }
  return new Contract(address, validatorRegistryAbi, provider);
}

function getStakingRewardsContract() {
  const address = process.env.STAKING_REWARDS_ADDRESS;
  if (!address) {
    return null;
  }
  return new Contract(address, stakingRewardsAbi, provider);
}

async function safeCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function getOnChainSnapshot(validator: string, account: string): Promise<ProofOnChainSnapshot> {
  const registry = getValidatorRegistryContract();
  const rewards = getStakingRewardsContract();

  if (!registry || !rewards) {
    return {
      validatorActive: true,
      validatorStake: '0',
      pendingRewards: '0'
    };
  }

  const [validatorData, pendingRewards] = await Promise.all([
    safeCall(() => registry.getValidator(validator), null),
    safeCall(() => rewards.previewReward(validator), 0n)
  ]);

  const stake = validatorData ? (validatorData.stake ?? validatorData[1] ?? 0n) : 0n;
  const active = validatorData ? Boolean(validatorData.active ?? validatorData[2]) : false;

  return {
    validatorActive: active,
    validatorStake: stake === 0n ? '0' : formatUnits(stake, 18),
    pendingRewards: pendingRewards === 0n ? '0' : formatUnits(pendingRewards, 18)
  };
}

export interface ProofStats {
  totalProofs: number;
  statuses: Record<ProofStatus, number>;
  latestBlock: number;
  uniqueAddresses: number;
}

export async function getVerifiedData(address?: string, eventType?: string): Promise<ProofData[]> {
  const filtered = proofStore.filter((proof) => {
    const matchAddress = address ? proof.address.toLowerCase() === address.toLowerCase() : true;
    const matchEventType = eventType ? proof.eventType === eventType : true;
    return matchAddress && matchEventType;
  });

  return Promise.all(
    filtered.map(async (proof) => ({
      ...proof,
      onChain: await getOnChainSnapshot(proof.validator, proof.address)
    }))
  );
}

export async function submitProof(txHash: string): Promise<ProofData> {
  if (!txHash?.startsWith('0x')) {
    throw new Error('txHash must be a 0x-prefixed value');
  }

  const baseProof = proofStore.at(0);
  const tx = await provider.getTransaction(txHash).catch(() => null);

  const template = baseProof ?? generateMockProofs(1)[0];

  const proof: ProofData = {
    ...template,
    id: randomUUID(),
    txHash,
    blockNumber: tx?.blockNumber ?? (baseProof?.blockNumber ?? 0) + 1,
    timestamp: new Date().toISOString(),
    status: 'pending',
    confidence: 0.8,
    onChain: await getOnChainSnapshot(template.validator, template.address)
  };

  appendProof(proof);

  return proof;
}

export function queryStats(): ProofStats {
  const statuses: Record<ProofStatus, number> = {
    verified: 0,
    pending: 0,
    rejected: 0
  };

  let latestBlock = 0;
  const addresses = new Set<string>();

  for (const proof of proofStore) {
    statuses[proof.status] = (statuses[proof.status] ?? 0) + 1;
    latestBlock = Math.max(latestBlock, proof.blockNumber);
    addresses.add(proof.address.toLowerCase());
  }

  return {
    totalProofs: proofStore.length,
    statuses,
    latestBlock,
    uniqueAddresses: addresses.size
  };
}

export function buildSdkContext() {
  return {
    sdk: {
      getVerifiedData,
      submitProof,
      queryStats
    }
  };
}

export type SdkContext = ReturnType<typeof buildSdkContext>;
