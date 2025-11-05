import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_INDEX_NODE_URL: z.string().url().default("http://localhost:4000/graphql"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_STAKING_CONTRACT: z.string().optional()
});

export const env = envSchema.parse(process.env);
