import { z } from 'zod';

export const rewardDistributionSchema = z.object({
  datasetId: z.string().min(3),
  recipient: z.string().min(4),
  amount: z.number().positive(),
  timestamp: z.string().datetime().optional()
});

export const rewardClaimSchema = z.object({
  address: z.string().min(4)
});
