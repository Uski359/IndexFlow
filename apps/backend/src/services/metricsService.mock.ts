import fs from 'node:fs';
import path from 'node:path';

import { getAddress, getBytes, keccak256, toUtf8Bytes } from 'ethers';

import { logger } from '../infra/config/logger.js';
import type { UsageSummary, UsageWindow } from '../core/contracts/usageOutputV1.js';

export type MetricsRequest = {
  campaign_id: string;
  window: UsageWindow;
  wallet: string;
};

export type MetricsService = {
  getUsageSummary: (request: MetricsRequest) => UsageSummary;
};

type MetricsDataset = Record<string, Record<string, Record<string, UsageSummary>>>;

const DATASET_FILENAME = 'campaign-airdrop_v1.json';
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

const normalizeSummary = (summary: UsageSummary): UsageSummary => ({
  days_active: clampMetric(summary.days_active, RANGE_LIMITS.days_active),
  tx_count: clampMetric(summary.tx_count, RANGE_LIMITS.tx_count),
  unique_contracts: clampMetric(summary.unique_contracts, RANGE_LIMITS.unique_contracts)
});

const getDatasetSummary = (
  campaign_id: string,
  windowType: UsageWindow['type'],
  wallet: string
): UsageSummary | undefined => {
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
  window: UsageWindow,
  wallet: string
): UsageSummary => {
  const seed = `${campaign_id}:${window.start}:${window.end}:${wallet}`;
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

export const metricsService: MetricsService = {
  getUsageSummary: (request) => {
    const campaign_id = request.campaign_id.trim();
    const normalizedWallet = getAddress(request.wallet);
    const fromDataset = getDatasetSummary(campaign_id, request.window.type, normalizedWallet);

    if (fromDataset) {
      return fromDataset;
    }

    return generateDeterministicSummary(campaign_id, request.window, normalizedWallet);
  }
};

export const getMetricsDatasetPath = () => cachedDatasetPath ?? resolveDatasetPath();

