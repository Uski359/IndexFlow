import { Interface, type Log } from 'ethers';

const iface = new Interface([
  'event ProofSubmitted(address indexed operator, bytes32 indexed chainId, uint256 fromBlock, uint256 toBlock, bytes32 proofHash, uint256 timestamp)'
]);

export const PROOF_SUBMITTED_TOPIC =
  '0x86546f62a084fb8df4b5a3920e73c4535a7a44c7bf435a380e125966e9f1639f';

export interface ParsedProof {
  operator: string;
  chainId: string;
  fromBlock: number;
  toBlock: number;
  proofHash: string;
  timestamp: number;
}

export const parseProofSubmitted = (log: Log): ParsedProof => {
  const parsed = iface.parseLog(log);

  if (!parsed) {
    throw new Error('Failed to parse ProofSubmitted log');
  }

  const [operator, chainId, fromBlock, toBlock, proofHash, timestamp] = parsed.args;

  return {
    operator,
    chainId,
    fromBlock: Number(fromBlock),
    toBlock: Number(toBlock),
    proofHash,
    timestamp: Number(timestamp)
  };
};
