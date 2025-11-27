export interface ActivityPointDTO {
  timestamp: string;
  count: number;
}

export interface ActivityStatDTO {
  volume24h: number;
  series?: ActivityPointDTO[];
}

export interface ThroughputStatDTO {
  transferCount24h: number;
}
