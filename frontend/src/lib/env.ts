import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_INDEX_NODE_URL: z.string().url().default("http://localhost:4000/graphql"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_RPC_URL: z
    .string()
    .url()
    .default("https://eth-sepolia.g.alchemy.com/v2/vtMDks-q4F59s_mGE9HGg"),
  // Default to deployed Sepolia contracts; can be overridden via .env.local
  NEXT_PUBLIC_STAKING_CONTRACT: z
    .string()
    .default("0x36ac3A27DCcF03af2AF1A204F1A1610870F3fDc3"),
  NEXT_PUBLIC_STAKE_TOKEN_ADDRESS: z
    .string()
    .default("0x93b95F6956330f4a56E7A94457A7E597a7340E61"),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().default(11155111)
});

export const env = envSchema.parse(process.env);
