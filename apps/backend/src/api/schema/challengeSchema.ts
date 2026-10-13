import { z } from 'zod';

export const challengeSchema = z.object({
  entryId: z.string().min(3),
  challenger: z.string().min(4),
  reason: z.string().min(10).max(280),
  bond: z.number().min(1)
});
