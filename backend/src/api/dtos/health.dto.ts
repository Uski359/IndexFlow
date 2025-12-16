export interface IndexerHealthDTO {
  chain: string;
  latestIndexedBlock: number | null;
  providerBlock: number | null;
  currentChainBlock: number | null;
  lag: number | null;
  synced: boolean;
  updatedAt: Date | null;
}
