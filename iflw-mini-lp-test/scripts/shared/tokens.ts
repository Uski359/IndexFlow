import { ethers } from "ethers";

export interface SortedPair {
  token0: string;
  token1: string;
  flipped: boolean;
}

export function sortTokens(tokenA: string, tokenB: string): SortedPair {
  if (!ethers.isAddress(tokenA) || !ethers.isAddress(tokenB)) {
    throw new Error("sortTokens received invalid address inputs");
  }
  if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
    throw new Error("Tokens must be distinct");
  }
  const [token0, token1] = [tokenA, tokenB].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1));
  return { token0, token1, flipped: token0.toLowerCase() !== tokenA.toLowerCase() };
}

export function describePair(pair: SortedPair): string {
  return `${pair.token0} / ${pair.token1}`;
}
