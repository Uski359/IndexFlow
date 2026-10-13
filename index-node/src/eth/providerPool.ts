import { JsonRpcProvider } from "ethers";
import type { Logger } from "pino";
import { env } from "@config/env";
import { logger as defaultLogger } from "@telemetry/logger";
import { recordRpcProviderRateLimit } from "@telemetry/metrics";
import { sleep } from "@utils/sleep";

type RpcEndpoint = {
  url: string;
  provider: JsonRpcProvider;
  cooldownUntil: number;
  index: number;
  disabled: boolean;
  lastCooldownLogged?: number;
  disabledLogged?: boolean;
};

export type RpcProviderPoolOptions = {
  cooldownMs?: number;
  logger?: Logger;
  providerFactory?: (url: string) => JsonRpcProvider;
};

const RATE_LIMIT_MARKERS = [
  "rate limit",
  "too many requests",
  "status 429",
  "http status 429",
  "request limit exceeded",
  "exceeded rate limit",
  "context deadline exceeded",
  "429"
];

export function isRateLimitError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const anyError = error as Record<string, unknown>;
  const numericCode = Number(anyError.code);
  const responseStatus =
    typeof anyError.response === "object" && anyError.response !== null
      ? (anyError.response as Record<string, unknown>).status
      : undefined;
  const status = Number(anyError.status ?? anyError.code ?? responseStatus);
  if (status === 429 || numericCode === 429 || numericCode === -32005) {
    return true;
  }

  const shortMessage = String(anyError.shortMessage ?? "");
  const message = String(anyError.message ?? shortMessage ?? "").toLowerCase();

  if (
    (anyError.code === "RATE_LIMITED" ||
      anyError.code === "RATE_LIMIT" ||
      anyError.code === "SERVER_ERROR") &&
    (anyError["status"] === 429 || message.includes("rate limit"))
  ) {
    return true;
  }

  if (Array.isArray((anyError as any).value)) {
    const entries = (anyError as any).value as Array<Record<string, unknown>>;
    for (const entry of entries) {
      const entryCode = Number(entry.code);
      if (entryCode === -32005) {
        return true;
      }
      const entryMessage = String(entry.message ?? "").toLowerCase();
      if (RATE_LIMIT_MARKERS.some((marker) => entryMessage.includes(marker))) {
        return true;
      }
    }
  }

  return RATE_LIMIT_MARKERS.some((marker) => message.includes(marker));
}

const BAD_ENDPOINT_MARKERS = ["invalid method", "404"];
const NETWORK_DETECT_MARKER = "failed to detect network and cannot start up";

function isBadEndpointError(error: unknown): boolean {
  if (!error) {
    return false;
  }
  const anyError = error as Record<string, unknown>;
  const responseStatus =
    typeof anyError.response === "object" && anyError.response !== null
      ? (anyError.response as Record<string, unknown>).status
      : undefined;
  const status = Number(anyError.status ?? anyError.code ?? responseStatus);
  if (status === 404) {
    return true;
  }
  const message = String(anyError.message ?? anyError.shortMessage ?? "").toLowerCase();
  if (message.includes(NETWORK_DETECT_MARKER)) {
    return true;
  }
  return BAD_ENDPOINT_MARKERS.some((marker) => message.includes(marker));
}

export class RpcProviderPool {
  private readonly endpoints: RpcEndpoint[];
  private readonly cooldownMs: number;
  private readonly logger: Logger;
  private readonly providerFactory: (url: string) => JsonRpcProvider;
  private lastAllCooldownLogged = 0;
  private lastIndex = -1;

  constructor(urls: string[], options: RpcProviderPoolOptions = {}) {
    if (!urls || urls.length === 0) {
      throw new Error("At least one RPC URL must be provided");
    }
    this.cooldownMs = options.cooldownMs ?? 60_000;
    this.logger = options.logger ?? defaultLogger;
    const chainIdNum = Number(env.CHAIN_ID);
    const staticNetwork = Number.isFinite(chainIdNum) ? chainIdNum : undefined;
    this.providerFactory =
      options.providerFactory ??
      ((url: string) => new JsonRpcProvider(url, staticNetwork as any));
    this.endpoints = urls.map((url, index) => ({
      url,
      provider: this.providerFactory(url),
      cooldownUntil: 0,
      index,
      disabled: false
    }));
  }

  getProvider(): JsonRpcProvider {
    const selection = this.selectEndpoint();
    if (!selection) {
      throw new Error("No RPC providers available");
    }
    if (selection.usedFallback) {
      this.logAllCooling(selection.endpoint);
    }
    this.logger.debug(
      { url: selection.endpoint.url, index: selection.endpoint.index },
      "Using RPC provider"
    );
    return selection.endpoint.provider;
  }

  async withProvider<T>(fn: (provider: JsonRpcProvider) => Promise<T>): Promise<T> {
    let attempts = 0;
    let lastError: unknown;

    while (attempts < this.endpoints.length) {
      const selection = this.selectEndpoint();
      if (!selection) {
        break;
      }
      const { endpoint, usedFallback } = selection;
      attempts += 1;

      if (usedFallback) {
        const waitMs = this.logAllCooling(endpoint);
        if (waitMs > 0 && endpoint.cooldownUntil > Date.now()) {
          const sleepMs = Math.min(waitMs, this.cooldownMs);
          this.logger.warn(
            { waitMs: sleepMs, url: endpoint.url },
            "All RPC providers cooling down; sleeping before retry"
          );
          await sleep(sleepMs);
        }
      }
      this.logger.debug({ url: endpoint.url, index: endpoint.index }, "Using RPC provider");
      try {
        return await fn(endpoint.provider);
      } catch (error) {
        lastError = error;
        if (isRateLimitError(error)) {
          this.cooldown(endpoint);
          recordRpcProviderRateLimit(endpoint.url);
          continue;
        }
        if (isBadEndpointError(error)) {
          this.disableEndpoint(endpoint, error);
          continue;
        }
        throw error;
      }
    }

    const fallback = this.selectEndpoint();
    if (fallback) {
      if (fallback.usedFallback) {
        const waitMs = this.logAllCooling(fallback.endpoint);
        if (waitMs > 0 && fallback.endpoint.cooldownUntil > Date.now()) {
          const sleepMs = Math.min(waitMs, this.cooldownMs);
          this.logger.warn(
            { waitMs: sleepMs, url: fallback.endpoint.url },
            "All RPC providers cooling down; sleeping before retry"
          );
          await sleep(sleepMs);
        }
      }
      this.logger.debug(
        { url: fallback.endpoint.url, index: fallback.endpoint.index },
        "Using RPC provider"
      );
      return fn(fallback.endpoint.provider);
    }

    throw lastError ?? new Error("No RPC providers available");
  }

  private cooldown(endpoint: RpcEndpoint) {
    const now = Date.now();
    const alreadyCooling = endpoint.cooldownUntil > now;
    if (!alreadyCooling) {
      endpoint.cooldownUntil = now + this.cooldownMs;
    }

    const lastLogged = endpoint.lastCooldownLogged ?? 0;
    if (alreadyCooling && now - lastLogged < 10_000) {
      return;
    }

    endpoint.lastCooldownLogged = now;
    this.logger.warn(
      { url: endpoint.url, cooldownMs: this.cooldownMs },
      "RPC provider rate limited; entering cooldown"
    );
  }

  private selectEndpoint(): { endpoint: RpcEndpoint; usedFallback: boolean } | null {
    const healthy = this.getNextEndpoint(false);
    if (healthy) {
      return { endpoint: healthy, usedFallback: false };
    }
    const fallback = this.getNextEndpoint(true);
    if (!fallback) {
      return null;
    }
    return { endpoint: fallback, usedFallback: true };
  }

  private getNextEndpoint(ignoreCooldown: boolean): RpcEndpoint | null {
    const now = Date.now();
    for (let i = 0; i < this.endpoints.length; i += 1) {
      const index = (this.lastIndex + 1 + i) % this.endpoints.length;
      const endpoint = this.endpoints[index];
      if (endpoint.disabled) {
        continue;
      }
      const isCoolingDown = endpoint.cooldownUntil > now;
      if (ignoreCooldown || !isCoolingDown) {
        this.lastIndex = index;
        return endpoint;
      }
    }
    return null;
  }

  private logAllCooling(fallback: RpcEndpoint): number {
    const now = Date.now();
    const nextAvailableInMs = this.nextAvailableCooldownMs(now);
    if (now - this.lastAllCooldownLogged > 2_000) {
      this.lastAllCooldownLogged = now;
      this.logger.warn(
        {
          fallbackUrl: fallback.url,
          nextAvailableInMs
        },
        "All RPC providers in cooldown; using fallback provider"
      );
    }
    return nextAvailableInMs;
  }

  private disableEndpoint(endpoint: RpcEndpoint, error: unknown) {
    if (endpoint.disabledLogged) {
      endpoint.disabled = true;
      return;
    }
    endpoint.disabled = true;
    endpoint.disabledLogged = true;
    this.logger.error(
      { url: endpoint.url, error },
      "Disabling RPC provider due to persistent bad responses"
    );
  }

  private nextAvailableCooldownMs(now = Date.now()): number {
    const times = this.endpoints
      .filter((endpoint) => !endpoint.disabled)
      .map((endpoint) => Math.max(endpoint.cooldownUntil - now, 0))
      .filter((ms) => ms > 0);
    if (times.length === 0) {
      return 0;
    }
    return Math.min(...times);
  }
}
