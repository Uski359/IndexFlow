import type { UsageOutputV1, UsageWindow } from '../core/contracts/usageOutputV1.js';
import type {
  CampaignRunRequest,
  EvaluationMeta,
  CampaignRunResult,
  CampaignRunSummary
} from './evaluatorService.js';
import { evaluatorService } from './evaluatorService.js';
import { computeInsightV1, type InsightV1 } from '../core/insights/insightsV1.js';
import { insightsCache, type CacheService } from './cacheService.js';

export type InsightCacheResult = {
  insights: InsightV1;
  cached: boolean;
};

export type CampaignInsightItem = {
  wallet: string;
  output: UsageOutputV1;
  insights: InsightV1;
  cached_core: boolean;
  cached_insights: boolean;
};

export type CampaignInsightsSummary = {
  total: number;
  verified_true: number;
  verified_false: number;
  verified_rate: number;
  avg_tx_count: number;
  avg_days_active: number;
  avg_unique_contracts: number;
  suspected_farm_count: number;
  suspected_farm_rate: number;
  avg_score: number;
};

export type CampaignInsightsResult = {
  campaign_id: string;
  window: UsageWindow;
  meta: EvaluationMeta;
  results: CampaignInsightItem[];
  summary: CampaignInsightsSummary;
};

export type InsightsDependencies = {
  cache?: CacheService<InsightV1>;
  evaluator?: {
    runCampaignBatch: (request: CampaignRunRequest) => Promise<CampaignRunResult>;
  };
};

const INSIGHTS_VERSION = 'v1' as const;

export const buildInsightCacheKey = (output: UsageOutputV1) =>
  `insights:${INSIGHTS_VERSION}:${output.campaign_id}:${output.window.start}:${output.window.end}:${output.criteria.criteria_set_id}:${output.wallet}:${output.proof.canonical_hash}`;

const summarizeCampaignInsights = (
  baseSummary: CampaignRunSummary,
  results: CampaignInsightItem[]
): CampaignInsightsSummary => {
  const total = baseSummary.total;
  let suspected_farm_count = 0;
  let score_total = 0;

  for (const entry of results) {
    if (entry.insights.behavior_tag === 'suspected_farm') {
      suspected_farm_count += 1;
    }
    score_total += entry.insights.overall_score;
  }

  const avg_score = total ? score_total / total : 0;

  return {
    ...baseSummary,
    suspected_farm_count,
    suspected_farm_rate: total ? suspected_farm_count / total : 0,
    avg_score
  };
};

export const createInsightsService = (deps: InsightsDependencies = {}) => {
  const cache = deps.cache ?? insightsCache;
  const evaluator = deps.evaluator ?? evaluatorService;

  const computeInsight = (output: UsageOutputV1): InsightCacheResult => {
    const cacheKey = buildInsightCacheKey(output);
    const cachedInsight = cache.get(cacheKey);
    if (cachedInsight) {
      return { insights: cachedInsight, cached: true };
    }

    const insights = computeInsightV1(output);
    cache.set(cacheKey, insights);
    return { insights, cached: false };
  };

  const runCampaignInsights = async (
    request: CampaignRunRequest
  ): Promise<CampaignInsightsResult> => {
    const coreResult = await evaluator.runCampaignBatch(request);

    const results = coreResult.results.map((entry) => {
      const computed = computeInsight(entry.output);
      return {
        wallet: entry.wallet,
        output: entry.output,
        insights: computed.insights,
        cached_core: entry.cached,
        cached_insights: computed.cached
      };
    });

    const resolvedWindow = results.length
      ? results[0].output.window
      : ({
          type: request.window.type,
          start: request.window.start ?? 0,
          end: request.window.end
        } as UsageWindow);

    return {
      campaign_id: request.campaign_id,
      window: resolvedWindow,
      meta: coreResult.meta,
      results,
      summary: summarizeCampaignInsights(coreResult.summary, results)
    };
  };

  return {
    computeInsight,
    runCampaignInsights
  };
};

export const insightsService = createInsightsService();

