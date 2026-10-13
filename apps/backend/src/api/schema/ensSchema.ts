import { z } from 'zod';

export const ensResolveQuerySchema = z.object({
  name: z.string().min(1)
});
