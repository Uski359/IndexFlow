import { z } from 'zod';

export const stakeSchema = z.object({
  address: z.string().min(4),
  amount: z.number().min(1),
  stakeType: z.enum(['passive', 'active']),
  lockDays: z.number().min(7).max(365)
});

export const unstakeSchema = z.object({
  stakeId: z.string().min(3)
});
