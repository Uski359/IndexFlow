import { AbiCoder, keccak256 } from "ethers";

const abi = new AbiCoder();

export type TransferLike = {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  token: string;
  from: string;
  to: string;
  value: string;
};

export function computeTransferLeaf(transfer: TransferLike): string {
  const encoded = abi.encode(
    ["bytes32", "uint256", "uint256", "address", "address", "uint256"],
    [
      transfer.txHash,
      BigInt(transfer.logIndex),
      BigInt(transfer.blockNumber),
      transfer.token,
      transfer.from,
      BigInt(transfer.value)
    ]
  );
  return keccak256(encoded);
}

const ZERO_HASH = `0x${"0".repeat(64)}`;

export function computeMerkleRootFromTransfers(transfers: TransferLike[]): string {
  if (transfers.length === 0) {
    return ZERO_HASH;
  }

  let level = transfers.map((transfer) => computeTransferLeaf(transfer));

  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 >= level.length) {
        nextLevel.push(level[i]);
      } else {
        const encoded = abi.encode(["bytes32", "bytes32"], [level[i], level[i + 1]]);
        nextLevel.push(keccak256(encoded));
      }
    }
    level = nextLevel;
  }

  return level[0];
}
