import type { JsonRpcProvider } from "ethers";
import type { Logger } from "pino";
import { describe, expect, it, vi, afterEach } from "vitest";
import { RpcProviderPool, isRateLimitError } from "@eth/providerPool";
import { recordRpcProviderRateLimit } from "@telemetry/metrics";

vi.mock("@telemetry/metrics", () => ({
  recordRpcProviderRateLimit: vi.fn()
}));

type MockLogger = Logger & {
  debug: ReturnType<typeof vi.fn>;
  info: ReturnType<typeof vi.fn>;
  warn: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

const createMockLogger = (): MockLogger =>
  ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  } as unknown as MockLogger);

const providerFactory = (url: string): JsonRpcProvider =>
  ({ url } as unknown as JsonRpcProvider);

const rateLimitError = () => {
  const error = new Error("429 rate limit");
  (error as any).status = 429;
  return error;
};

describe("RpcProviderPool", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("round robins between providers on success", async () => {
    const logger = createMockLogger();
    const pool = new RpcProviderPool(
      ["http://rpc-1", "http://rpc-2", "http://rpc-3"],
      { logger, providerFactory }
    );

    const selected: string[] = [];
    await pool.withProvider(async (provider) => {
      selected.push((provider as any).url);
      return null;
    });
    await pool.withProvider(async (provider) => {
      selected.push((provider as any).url);
      return null;
    });
    await pool.withProvider(async (provider) => {
      selected.push((provider as any).url);
      return null;
    });

    expect(selected).toEqual(["http://rpc-1", "http://rpc-2", "http://rpc-3"]);
    expect(logger.debug).toHaveBeenCalledTimes(3);
  });

  it("cools down rate-limited provider and retries with the next endpoint", async () => {
    const logger = createMockLogger();
    const pool = new RpcProviderPool(["http://primary", "http://secondary"], {
      cooldownMs: 60_000,
      logger,
      providerFactory
    });

    const rateLimitSpy = vi.mocked(recordRpcProviderRateLimit);

    const result = await pool.withProvider(async (provider) => {
      const url = (provider as any).url;
      if (url === "http://primary") {
        throw rateLimitError();
      }
      return url;
    });

    expect(result).toBe("http://secondary");
    expect(rateLimitSpy).toHaveBeenCalledWith("http://primary");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://primary", cooldownMs: 60_000 }),
      expect.stringContaining("cooldown")
    );

    const followUp = await pool.withProvider(async (provider) => (provider as any).url);
    expect(followUp).toBe("http://secondary");
  });

  it("logs fallback when every provider is cooling down", async () => {
    const logger = createMockLogger();
    const pool = new RpcProviderPool(["http://one", "http://two"], {
      cooldownMs: 500,
      logger,
      providerFactory
    });

    const rateLimitSpy = vi.mocked(recordRpcProviderRateLimit);

    await pool.withProvider(async () => {
      throw rateLimitError();
    }).catch(() => {
      // expected
    });

    expect(rateLimitSpy).toHaveBeenCalledTimes(2);
    const warnMessages = logger.warn.mock.calls.map(([, message]) => String(message));
    expect(warnMessages.some((msg) => msg.includes("All RPC providers in cooldown"))).toBe(true);
    expect(warnMessages.some((msg) => msg.includes("sleeping before retry"))).toBe(true);
  });

  it("disables providers that return fatal errors (e.g. invalid method)", async () => {
    const logger = createMockLogger();
    const pool = new RpcProviderPool(["http://bad", "http://good"], {
      logger,
      providerFactory
    });

    const fatalError = new Error("server response 404 invalid method");
    (fatalError as any).status = 404;

    const results: string[] = [];

    await pool.withProvider(async (provider) => {
      const url = (provider as any).url;
      if (url === "http://bad") {
        throw fatalError;
      }
      results.push(url);
      return null;
    });

    await pool.withProvider(async (provider) => {
      results.push((provider as any).url);
      return null;
    });

    expect(results).toEqual(["http://good", "http://good"]);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://bad", error: fatalError }),
      expect.stringContaining("Disabling RPC provider")
    );
  });
});

describe("isRateLimitError", () => {
  it("detects rate limit-like errors", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError({ code: "RATE_LIMITED", message: "Rate limit exceeded" })).toBe(true);
    expect(isRateLimitError(new Error("context deadline exceeded"))).toBe(true);
    expect(
      isRateLimitError({
        code: "BAD_DATA",
        value: [
          { code: -32005, message: "Too Many Requests", data: { see: "https://infura.io/dashboard" } }
        ]
      })
    ).toBe(true);
    expect(isRateLimitError(new Error("unexpected failure"))).toBe(false);
  });
});
