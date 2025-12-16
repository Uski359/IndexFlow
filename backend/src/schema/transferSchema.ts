import { z } from "zod";

export const TransferSchema = z.object({
  _id: z.any().optional(),
  chainId: z.union([z.string(), z.number()]).transform((value) => value.toString()),
  blockNumber: z.number(),
  txHash: z.string(),
  logIndex: z.number().int().nonnegative(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  timestamp: z.number(),
});

export type Transfer = z.infer<typeof TransferSchema>;
