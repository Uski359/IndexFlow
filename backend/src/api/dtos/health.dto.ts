export interface IndexerHealthDTO {
  chain: string;
  latestIndexedBlock: number | null;
  providerBlock: number | null;
  synced: boolean;
}
