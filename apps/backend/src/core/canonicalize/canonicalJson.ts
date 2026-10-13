import type { UsageOutputV1 } from '../contracts/usageOutputV1.js';

type KeyOrderMap = Record<string, string[]>;

const KEY_ORDER: KeyOrderMap = {
  '': [
    'protocol',
    'output_version',
    'wallet',
    'campaign_id',
    'window',
    'verified_usage',
    'usage_summary',
    'criteria',
    'proof'
  ],
  '/window': ['type', 'start', 'end'],
  '/usage_summary': ['days_active', 'tx_count', 'unique_contracts'],
  '/criteria': ['criteria_set_id', 'engine_version', 'params'],
  '/criteria/params': ['min_days_active', 'min_tx_count', 'min_unique_contracts'],
  '/proof': ['hash_algorithm', 'canonical_hash']
};

const orderKeys = (keys: string[], path: string) => {
  const preferred = KEY_ORDER[path];
  const fallbackCompare = (left: string, right: string) => {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  };

  if (!preferred) {
    return keys.sort(fallbackCompare);
  }

  const index = new Map(preferred.map((key, position) => [key, position]));
  return keys.sort((left, right) => {
    const leftIndex = index.get(left);
    const rightIndex = index.get(right);
    if (leftIndex !== undefined && rightIndex !== undefined) {
      return leftIndex - rightIndex;
    }
    if (leftIndex !== undefined) return -1;
    if (rightIndex !== undefined) return 1;
    return fallbackCompare(left, right);
  });
};

const stableStringify = (value: unknown, path = ''): string => {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((entry, index) =>
      stableStringify(entry, `${path}[${index}]`)
    );
    return `[${items.join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = orderKeys(Object.keys(record), path);
  const entries = keys.map((key) => {
    const nextPath = path ? `${path}/${key}` : `/${key}`;
    return `${JSON.stringify(key)}:${stableStringify(record[key], nextPath)}`;
  });
  return `{${entries.join(',')}}`;
};

export const canonicalizeUsageOutputV1 = (output: UsageOutputV1): string =>
  stableStringify(output);
