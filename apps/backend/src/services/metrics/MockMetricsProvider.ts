import fs from 'node:fs';
import path from 'node:path';

import { getAddress, getBytes, keccak256, toUtf8Bytes } from 'ethers';

import { logger } from '../../infra/config/logger.js';
import type {
  GetWalletMetricsInput,
  IMetricsProvider,
  WalletMetricsV1
} from './IMetricsProvider.js';

type WindowType = 'last_7_days' | 'last_14_days' | 'last_30_days' | 'custom';
type MetricsDataset = Record<string, Record<string, Record<string, WalletMetricsV1>>>;

const DATASET_FILENAME = 'campaign-airdrop_v1.json';
const WINDOW_SECONDS: Record<Exclude<WindowType, 'custom'>, number> = {
  last_7_days: 7 * 24 * 60 * 60,
  last_14_days: 14 * 24 * 60 * 60,
  last_30_days: 30 * 24 * 60 * 60
};
const RANGE_LIMITS = {
  days_active: 30,
  tx_count: 120,
  unique_contracts: 20
} as const;

let cachedDataset: MetricsDataset | null = null;
let cachedDatasetPath: string | null = null;

const resolveDatasetPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'mock-data', DATASET_FILENAME),
    path.resolve(process.cwd(), '..', 'mock-data', DATASET_FILENAME)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

const loadDataset = (): MetricsDataset => {
  if (cachedDataset) {
    return cachedDataset;
  }

  const datasetPath = resolveDatasetPath();
  cachedDatasetPath = datasetPath;
  if (!datasetPath) {
    cachedDataset = {};
    return cachedDataset;
  }

  try {
    const contents = fs.readFileSync(datasetPath, 'utf8');
    cachedDataset = (JSON.parse(contents) as MetricsDataset) ?? {};
  } catch (error) {
    logger.warn({ err: error, datasetPath }, 'Failed to load mock metrics dataset');
    cachedDataset = {};
  }

  return cachedDataset;
};

const clampMetric = (value: number, max: number) => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.trunc(value), 0), max);
};

const normalizeSummary = (summary: WalletMetricsV1): WalletMetricsV1 => ({
  days_active: clampMetric(summary.days_active, RANGE_LIMITS.days_active),
  tx_count: clampMetric(summary.tx_count, RANGE_LIMITS.tx_count),
  unique_contracts: clampMetric(summary.unique_contracts, RANGE_LIMITS.unique_contracts)
});

const resolveWindowType = (start: number, end: number): WindowType => {
  const delta = end - start;
  const entries = Object.entries(WINDOW_SECONDS) as Array<[Exclude<WindowType, 'custom'>, number]>;
  for (const [type, seconds] of entries) {
    if (delta === seconds) {
      return type;
    }
  }
  return 'custom';
};

const getDatasetSummary = (
  campaign_id: string,
  windowType: WindowType,
  wallet: string
): WalletMetricsV1 | undefined => {
  const dataset = loadDataset();
  const byCampaign = dataset[campaign_id];
  if (!byCampaign) {
    return undefined;
  }
  const byWindow = byCampaign[windowType];
  if (!byWindow) {
    return undefined;
  }
  const summary = byWindow[wallet];
  return summary ? normalizeSummary(summary) : undefined;
};

const readUint32 = (bytes: Uint8Array, offset: number) => {
  let value = 0;
  for (let index = 0; index < 4; index += 1) {
    value = value * 256 + bytes[offset + index];
  }
  return value;
};

const generateDeterministicSummary = (
  campaign_id: string,
  start: number,
  end: number,
  wallet: string
): WalletMetricsV1 => {
  const seed = `${campaign_id}:${start}:${end}:${wallet}`;
  const hash = keccak256(toUtf8Bytes(seed));
  const bytes = getBytes(hash);

  const days_active = readUint32(bytes, 0) % (RANGE_LIMITS.days_active + 1);
  const tx_count = readUint32(bytes, 4) % (RANGE_LIMITS.tx_count + 1);
  const unique_contracts =
    readUint32(bytes, 8) % (RANGE_LIMITS.unique_contracts + 1);

  return {
    days_active,
    tx_count,
    unique_contracts
  };
};

export class MockMetricsProvider implements IMetricsProvider {
  async getWalletMetrics(input: GetWalletMetricsInput): Promise<WalletMetricsV1> {
    void input.chain_id;
    void input.targets;
    const campaign_id = input.campaign_id.trim();
    const normalizedWallet = getAddress(input.wallet);
    const windowType = resolveWindowType(input.start, input.end);
    const fromDataset = getDatasetSummary(campaign_id, windowType, normalizedWallet);

    if (fromDataset) {
      return fromDataset;
    }

    return generateDeterministicSummary(
      campaign_id,
      input.start,
      input.end,
      normalizedWallet
    );
  }
}

export const getMockMetricsDatasetPath = () =>
  cachedDatasetPath ?? resolveDatasetPath();
