import { BigNumber, ethers } from 'ethers';

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
  return ethers.utils.solidityKeccak256(
    ['bytes32', 'uint256', 'uint256', 'address', 'address', 'uint256'],
    [
      transfer.txHash,
      transfer.logIndex,
      transfer.blockNumber,
      transfer.token,
      transfer.from,
      transfer.to,
      BigNumber.from(transfer.value),
    ],
  );
}

export function computeMerkleRootFromTransfers(transfers: TransferLike[]): string {
  if (transfers.length === 0) {
    return ethers.constants.HashZero;
  }

  let level = transfers.map((transfer) => computeTransferLeaf(transfer));

  while (level.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 >= level.length) {
        nextLevel.push(level[i]);
      } else {
        nextLevel.push(ethers.utils.solidityKeccak256(['bytes32', 'bytes32'], [level[i], level[i + 1]]));
      }
    }
    level = nextLevel;
  }

  return level[0];
}
