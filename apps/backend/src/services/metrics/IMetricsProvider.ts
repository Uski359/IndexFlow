export type WalletMetricsV1 = {
  tx_count: number;
  days_active: number;
  unique_contracts: number;
};

export type GetWalletMetricsInput = {
  chain_id: number;
  wallet: string;
  start: number;
  end: number;
  as_of_block?: number;
  campaign_id: string;
  targets?: string[];
};

export interface IMetricsProvider {
  getWalletMetrics(input: GetWalletMetricsInput): Promise<WalletMetricsV1>;
}
