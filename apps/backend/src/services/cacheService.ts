import type { UsageOutputV1 } from '../core/contracts/usageOutputV1.js';
import type { InsightV1 } from '../core/insights/insightsV1.js';
import type { CommentaryV1 } from './commentary/types.js';

export type CacheService<T> = {
  get: (key: string) => T | undefined;
  set: (key: string, value: T) => void;
  delete: (key: string) => void;
  clear: () => void;
};

export type CacheOptions = {
  ttlMs: number;
  now?: () => number;
  maxEntries?: number;
};

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TTLCache<T> implements CacheService<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly maxEntries?: number;

  constructor(options: CacheOptions) {
    this.ttlMs = options.ttlMs;
    this.now = options.now ?? (() => Date.now());
    this.maxEntries = options.maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.now()) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh LRU ordering on access.
    if (this.maxEntries) {
      this.store.delete(key);
      this.store.set(key, entry);
    }

    return entry.value;
  }

  set(key: string, value: T) {
    if (this.maxEntries) {
      this.store.delete(key);
    }
    this.store.set(key, { value, expiresAt: this.now() + this.ttlMs });
    if (this.maxEntries) {
      while (this.store.size > this.maxEntries) {
        const oldest = this.store.keys().next().value as string | undefined;
        if (!oldest) {
          break;
        }
        this.store.delete(oldest);
      }
    }
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000;

export const createTTLCache = <T>(options: CacheOptions) => new TTLCache<T>(options);

export const usageOutputCache = createTTLCache<UsageOutputV1>({
  ttlMs: DEFAULT_CACHE_TTL_MS
});

export const insightsCache = createTTLCache<InsightV1>({
  ttlMs: DEFAULT_CACHE_TTL_MS
});

export const commentaryCache = createTTLCache<CommentaryV1>({
  ttlMs: DEFAULT_CACHE_TTL_MS
});

