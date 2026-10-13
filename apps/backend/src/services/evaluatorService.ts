import createHttpError from 'http-errors';
import { getAddress, keccak256, toUtf8Bytes } from 'ethers';

import type {
  UsageOutputV1,
  UsageSummary,
  UsageWindow,
  UsageWindowType
} from '../core/contracts/usageOutputV1.js';
import type { UsageWindowInput } from '../core/evaluator/evaluateUsageV1.js';
import { evaluateUsageV1 } from '../core/evaluator/evaluateUsageV1.js';
import {
  getCampaign,
  getCampaignTargets,
  getDefaultCriteriaSet
} from '../config/campaignRegistry.js';
import { getLatestBlock } from '../infra/rpc/getLatestBlock.js';
import {
  usageOutputCache,
  type CacheService
} from './cacheService.js';
import type { IMetricsProvider } from './metrics/IMetricsProvider.js';
import { createMetricsProvider } from './metrics/index.js';

export type EvaluateRequest = {
  wallet: string;
  campaign_id: string;
  window: UsageWindowInput;
  as_of_block?: number;
};

export type EvaluationMeta = {
  as_of_block: number;
};

export type EvaluationResult = {
  output: UsageOutputV1;
  cached: boolean;
  meta: EvaluationMeta;
};

export type CampaignRunRequest = {
  campaign_id: string;
  window: UsageWindowInput;
  wallets: string[];
  mode: 'sync';
  as_of_block?: number;
};

export type CampaignRunItem = {
  wallet: string;
  output: UsageOutputV1;
  cached: boolean;
};

export type CampaignRunSummary = {
  total: number;
  verified_true: number;
  verified_false: number;
  verified_rate: number;
  avg_tx_count: number;
  avg_days_active: number;
  avg_unique_contracts: number;
};

export type CampaignRunResult = {
  results: CampaignRunItem[];
  summary: CampaignRunSummary;
  meta: EvaluationMeta;
};

export type EvaluatorDependencies = {
  cache?: CacheService<UsageOutputV1>;
  metricsProvider?: IMetricsProvider;
};

const WINDOW_SECONDS: Record<Exclude<UsageWindowType, 'custom'>, number> = {
  last_7_days: 7 * 24 * 60 * 60,
  last_14_days: 14 * 24 * 60 * 60,
  last_30_days: 30 * 24 * 60 * 60
};

const toInteger = (value: number, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createHttpError(400, `${label} must be a finite number`);
  }
  return Math.trunc(value);
};

const resolveWindow = (input: UsageWindowInput): UsageWindow => {
  if (!input || !input.type) {
    throw createHttpError(400, 'window.type is required');
  }
  if (input.end === undefined) {
    throw createHttpError(400, 'window.end is required');
  }

  const end = toInteger(input.end, 'window.end');
  let start = input.start;

  if (input.type === 'custom') {
    if (start === undefined) {
      throw createHttpError(400, 'window.start is required for custom windows');
    }
    return {
      type: input.type,
      start: toInteger(start, 'window.start'),
      end
    };
  }

  if (start === undefined) {
    start = end - WINDOW_SECONDS[input.type];
  }

  return {
    type: input.type,
    start: toInteger(start, 'window.start'),
    end
  };
};

const normalizeWallet = (wallet: string) => {
  try {
    return getAddress(wallet.trim());
  } catch (error) {
    throw createHttpError(400, 'wallet must be a valid address');
  }
};

const resolveAsOfBlock = async (
  chain_id: number,
  as_of_block?: number
): Promise<number> => {
  if (as_of_block !== undefined) {
    const resolved = toInteger(as_of_block, 'as_of_block');
    if (resolved < 0) {
      throw createHttpError(400, 'as_of_block must be non-negative');
    }
    return resolved;
  }

  return getLatestBlock(chain_id);
};

const buildCacheKey = (
  campaign_id: string,
  window: UsageWindow,
  criteria_set_id: string,
  normalizedWallet: string
) => `v1:${campaign_id}:${window.start}:${window.end}:${criteria_set_id}:${normalizedWallet}`;

const summarizeResults = (results: CampaignRunItem[]): CampaignRunSummary => {
  const total = results.length;
  const verified_true = results.filter((entry) => entry.output.verified_usage).length;
  const verified_false = total - verified_true;
  const verified_rate = total ? verified_true / total : 0;

  let total_tx_count = 0;
  let total_days_active = 0;
  let total_unique_contracts = 0;

  for (const entry of results) {
    const summary = entry.output.usage_summary;
    total_tx_count += summary.tx_count;
    total_days_active += summary.days_active;
    total_unique_contracts += summary.unique_contracts;
  }

  return {
    total,
    verified_true,
    verified_false,
    verified_rate,
    avg_tx_count: total ? total_tx_count / total : 0,
    avg_days_active: total ? total_days_active / total : 0,
    avg_unique_contracts: total ? total_unique_contracts / total : 0
  };
};

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const workerCount = Math.min(concurrency, items.length);
  const runners = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
};

export const createEvaluatorService = (deps: EvaluatorDependencies = {}) => {
  const cache = deps.cache ?? usageOutputCache;
  const metricsProvider = deps.metricsProvider ?? createMetricsProvider();

  const evaluateWallet = async (request: EvaluateRequest): Promise<EvaluationResult> => {
    if (!request.campaign_id || typeof request.campaign_id !== 'string') {
      throw createHttpError(400, 'campaign_id is required');
    }
    if (!request.wallet || typeof request.wallet !== 'string') {
      throw createHttpError(400, 'wallet is required');
    }

    const campaign_id = request.campaign_id.trim();
    if (!campaign_id) {
      throw createHttpError(400, 'campaign_id is required');
    }
    const campaign = getCampaign(campaign_id);
    if (!campaign) {
      throw createHttpError(400, `Unknown campaign_id: ${campaign_id}`);
    }
    const criteria_set_id = getDefaultCriteriaSet(campaign_id);
    const targets = getCampaignTargets(campaign_id);

    const normalizedWallet = normalizeWallet(request.wallet);
    const window = resolveWindow(request.window);
    const as_of_block = await resolveAsOfBlock(campaign.chain_id, request.as_of_block);
    const cacheKey = buildCacheKey(campaign_id, window, criteria_set_id, normalizedWallet);

    const cachedOutput = cache.get(cacheKey);
    if (cachedOutput) {
      return {
        output: cachedOutput,
        cached: true,
        meta: { as_of_block }
      };
    }

    const usage_summary: UsageSummary = await metricsProvider.getWalletMetrics({
      chain_id: campaign.chain_id,
      campaign_id,
      wallet: normalizedWallet,
      start: window.start,
      end: window.end,
      as_of_block,
      targets
    });

    const output = evaluateUsageV1({
      wallet: normalizedWallet,
      campaign_id,
      window,
      criteria: {
        criteria_set_id
      },
      activity: {
        type: 'summary',
        summary: usage_summary
      }
    });

    cache.set(cacheKey, output);
    return {
      output,
      cached: false,
      meta: { as_of_block }
    };
  };

  const runCampaignBatch = async (request: CampaignRunRequest): Promise<CampaignRunResult> => {
    if (request.mode !== 'sync') {
      throw createHttpError(400, 'Only sync mode is supported');
    }
    const campaign_id = request.campaign_id.trim();
    const campaign = getCampaign(campaign_id);
    if (!campaign) {
      throw createHttpError(400, `Unknown campaign_id: ${campaign_id}`);
    }
    const as_of_block = await resolveAsOfBlock(campaign.chain_id, request.as_of_block);

    const results = await mapWithConcurrency(
      request.wallets,
      15,
      async (wallet) => {
        const evaluation = await evaluateWallet({
          wallet,
          campaign_id,
          window: request.window,
          as_of_block
        });

        return {
          wallet: evaluation.output.wallet,
          output: evaluation.output,
          cached: evaluation.cached
        };
      }
    );

    return {
      results,
      summary: summarizeResults(results),
      meta: { as_of_block }
    };
  };

  const generateMockWallets = (campaign_id: string, count: number) => {
    const resolvedCount = Number.isFinite(count) && count > 0 ? Math.trunc(count) : 0;
    const wallets: string[] = [];

    for (let index = 0; index < resolvedCount; index += 1) {
      const seed = `${campaign_id}:${index}`;
      const hash = keccak256(toUtf8Bytes(seed));
      const hex = `0x${hash.slice(2, 42)}`;
      wallets.push(getAddress(hex));
    }

    return wallets;
  };

  return {
    evaluateWallet,
    runCampaignBatch,
    generateMockWallets
  };
};

export const evaluatorService = createEvaluatorService();

