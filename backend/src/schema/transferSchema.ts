import { z } from "zod";

export const TransferSchema = z.object({
  _id: z.any().optional(),
  chainId: z.string(),
  blockNumber: z.number(),
  txHash: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  timestamp: z.number(),
});

export type Transfer = z.infer<typeof TransferSchema>;
