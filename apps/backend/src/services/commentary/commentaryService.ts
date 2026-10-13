import { logger } from '../../infra/config/logger.js';
import type { UsageOutputV1 } from '../../core/contracts/usageOutputV1.js';
import type { InsightV1 } from '../../core/insights/insightsV1.js';
import { commentaryCache, type CacheService } from '../cacheService.js';
import type { CommentaryV1 } from './types.js';
import type { CommentaryProvider } from './providers/provider.js';
import { DisabledProvider } from './providers/disabledProvider.js';
import { OpenAIProvider } from './providers/openAIProvider.js';

export type CommentaryCacheResult = {
  commentary: CommentaryV1;
  cached: boolean;
};

export type CommentaryDependencies = {
  cache?: CacheService<CommentaryV1>;
  provider?: CommentaryProvider;
};

const COMMENTARY_VERSION = 'v1' as const;

export const buildCommentaryCacheKey = (output: UsageOutputV1, insights: InsightV1) =>
  `commentary:${COMMENTARY_VERSION}:${output.campaign_id}:${output.window.start}:${output.window.end}:${output.criteria.criteria_set_id}:${output.wallet}:${output.proof.canonical_hash}:${insights.insight_version}`;

const createProviderFromEnv = () => {
  if (process.env.COMMENTARY_PROVIDER?.toLowerCase() !== 'openai') {
    return undefined;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('COMMENTARY_PROVIDER=openai but OPENAI_API_KEY is missing');
    return undefined;
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  return new OpenAIProvider({ apiKey, model });
};

export const createCommentaryService = (deps: CommentaryDependencies = {}) => {
  const cache = deps.cache ?? commentaryCache;
  const fallbackProvider = new DisabledProvider();
  const provider = deps.provider ?? createProviderFromEnv() ?? fallbackProvider;

  const getCommentaryForOutput = async (
    output: UsageOutputV1,
    insights: InsightV1
  ): Promise<CommentaryCacheResult> => {
    const cacheKey = buildCommentaryCacheKey(output, insights);
    const cachedCommentary = cache.get(cacheKey);
    if (cachedCommentary) {
      return { commentary: cachedCommentary, cached: true };
    }

    let text = '';
    let model = provider.name();

    if (provider.name() === fallbackProvider.name()) {
      text = await provider.generate({ output, insights });
    } else {
      try {
        text = await provider.generate({ output, insights });
      } catch (error) {
        logger.warn({ err: error }, 'Commentary provider failed, falling back');
        text = await fallbackProvider.generate({ output, insights });
        model = fallbackProvider.name();
      }
    }

    const commentary: CommentaryV1 = {
      commentary_version: 'v1',
      model,
      text,
      created_at: Math.floor(Date.now() / 1000)
    };

    cache.set(cacheKey, commentary);
    return { commentary, cached: false };
  };

  return {
    getCommentaryForOutput
  };
};

export const commentaryService = createCommentaryService();
