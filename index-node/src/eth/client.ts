import { JsonRpcProvider } from "ethers";
import { env } from "@config/env";
import { logger } from "@telemetry/logger";
import { RpcProviderPool } from "./providerPool";

export const rpcProviderPool = new RpcProviderPool(env.RPC_URLS, {
  cooldownMs: env.RPC_COOLDOWN_MS,
  logger
});

export const primaryRpcProvider = new JsonRpcProvider(env.PRIMARY_RPC_URL);

export function getRpcProvider(): JsonRpcProvider {
  return rpcProviderPool.getProvider();
}

export function withRpcProvider<T>(fn: (provider: JsonRpcProvider) => Promise<T>): Promise<T> {
  return rpcProviderPool.withProvider(fn);
}
