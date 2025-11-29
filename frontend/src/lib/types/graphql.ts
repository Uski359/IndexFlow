import { z } from "zod";

export const TransferSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  value: z.string(),
  blockNumber: z.number(),
  txHash: z.string()
});

export const TransfersConnectionSchema = z.object({
  items: z.array(TransferSchema),
  nextCursor: z.string().nullable()
});

export const DemoQuerySchema = z.object({
  latestBlock: z
    .object({
      number: z.number(),
      chainId: z.string()
    })
    .optional(),
  transfers: TransfersConnectionSchema.optional()
});

export type Transfer = z.infer<typeof TransferSchema>;
export type TransfersConnection = z.infer<typeof TransfersConnectionSchema>;
export type DemoQueryData = z.infer<typeof DemoQuerySchema>;
