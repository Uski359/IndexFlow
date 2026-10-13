import { isAddress } from 'ethers';
import { z } from 'zod';

const windowTypeSchema = z.enum(['last_7_days', 'last_14_days', 'last_30_days', 'custom']);

export const usageWindowSchema = z
  .object({
    type: windowTypeSchema,
    start: z.number().int().optional(),
    end: z.number().int()
  })
  .superRefine((value, ctx) => {
    if (value.type === 'custom' && value.start === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'window.start is required for custom windows',
        path: ['start']
      });
    }
  });

const walletSchema = z
  .string()
  .min(1)
  .refine((value) => isAddress(value), { message: 'wallet must be a valid address' });
const asOfBlockSchema = z.number().int().nonnegative().optional();

export const evaluateRequestSchema = z.object({
  wallet: walletSchema,
  campaign_id: z.string().min(1),
  window: usageWindowSchema,
  as_of_block: asOfBlockSchema
});

export const campaignRunRequestSchema = z.object({
  campaign_id: z.string().min(1),
  window: usageWindowSchema,
  wallets: z.array(walletSchema).min(1),
  mode: z.literal('sync'),
  as_of_block: asOfBlockSchema
});

const usageOutputWindowSchema = z.object({
  type: windowTypeSchema,
  start: z.number().int(),
  end: z.number().int()
});

const usageSummarySchema = z.object({
  days_active: z.number().int(),
  tx_count: z.number().int(),
  unique_contracts: z.number().int()
});

const usageCriteriaSchema = z
  .object({
    criteria_set_id: z.string().min(1)
  })
  .passthrough();

const usageProofSchema = z
  .object({
    canonical_hash: z.string().min(1)
  })
  .passthrough();

export const usageOutputSchema = z
  .object({
    protocol: z.string().min(1),
    output_version: z.string().min(1),
    wallet: walletSchema,
    campaign_id: z.string().min(1),
    window: usageOutputWindowSchema,
    verified_usage: z.boolean(),
    usage_summary: usageSummarySchema,
    criteria: usageCriteriaSchema,
    proof: usageProofSchema
  })
  .passthrough();

export const insightsRequestSchema = z.object({
  output: usageOutputSchema
});

export const campaignInsightsRequestSchema = campaignRunRequestSchema;

const insightSchema = z.object({
  insight_version: z.literal('v1'),
  overall_score: z.number(),
  farming_probability: z.number(),
  behavior_tag: z.enum(['organic', 'suspected_farm', 'inactive', 'mixed'])
});

export const commentaryRequestSchema = z.object({
  output: usageOutputSchema,
  insights: insightSchema
});

export const campaignCommentaryRequestSchema = campaignRunRequestSchema;

export const campaignParamsSchema = z.object({
  id: z.string().min(1)
});

export const mockWalletsQuerySchema = z.object({
  count: z.coerce.number().int().positive().max(1000).optional()
});
