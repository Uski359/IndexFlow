import crypto from 'node:crypto';

export type ProofStatus = 'verified' | 'pending' | 'rejected';

export interface ProofMetadata {
  dataset: string;
  merkleRoot: string;
  notes?: string;
}

export interface ProofOnChainSnapshot {
  validatorActive: boolean;
  validatorStake: string;
  pendingRewards: string;
}

export interface ProofData {
  id: string;
  address: string;
  eventType: string;
  txHash: string;
  blockNumber: number;
  validator: string;
  timestamp: string;
  status: ProofStatus;
  confidence: number;
  payloadHash: string;
  metadata: ProofMetadata;
  onChain?: ProofOnChainSnapshot;
}

const dataSets = ['feeds/prices', 'feeds/social', 'feeds/defi', 'feeds/nft'];
const eventTypes = ['ATTESTATION', 'REVOCATION', 'CHALLENGE', 'REWARD_DISTRIBUTION'];
const validators = [
  '0x4f19832a245a5a3aB1cC032e6388a035d3B7cC23',
  '0xa21bD32C67438Bf8D0ad3e299Bb1F6A1B6B8888C',
  '0x8d7E450cA12C9ccBD39b0E31779042f2Ce3c11a8'
];

const baseAddresses = [
  '0x1208a27682e247EFeFc0CC85E83d94ad0c5f61dD',
  '0xfF05BaAe3fDC6a8a5501A760a1Fd1eFD13c9A3d4',
  '0x71e783444f8e43c93419624793F0cF342Beb2321'
];

function randomHex(len: number) {
  return `0x${crypto.randomBytes(len / 2).toString('hex')}`;
}

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateMockProofs(count = 8): ProofData[] {
  return Array.from({ length: count }).map((_, idx) => {
    const blockBase = 19300000 + idx * 7;
    const address = randomItem(baseAddresses);
    const eventType = randomItem(eventTypes);

    return {
      id: crypto.randomUUID(),
      address,
      eventType,
      txHash: randomHex(64),
      blockNumber: blockBase + Math.floor(Math.random() * 50),
      validator: randomItem(validators),
      timestamp: new Date(Date.now() - idx * 60_000).toISOString(),
      status: Math.random() > 0.2 ? 'verified' : 'pending',
      confidence: Number((0.75 + Math.random() * 0.23).toFixed(2)),
      payloadHash: randomHex(64),
      metadata: {
        dataset: randomItem(dataSets),
        merkleRoot: randomHex(64),
        notes: 'Mock proof generated for SDK simulation'
      }
    };
  });
}

export const proofStore: ProofData[] = generateMockProofs(10);

export function listProofs() {
  return proofStore;
}

export function appendProof(proof: ProofData) {
  proofStore.unshift(proof);
  return proof;
}
