import { logger } from '../../infra/config/logger.js';
import type { IMetricsProvider } from './IMetricsProvider.js';
import { MockMetricsProvider } from './MockMetricsProvider.js';
import { metricsProvider } from './metricsProvider.js';

export type MetricsMode = 'mock' | 'rpc';

const normalizeMode = (value?: string): MetricsMode => {
  const raw = (value ?? 'mock').trim().toLowerCase();
  if (raw === 'rpc' || raw === 'live' || raw === 'db') {
    return 'rpc';
  }
  if (raw !== 'mock') {
    logger.warn({ mode: raw }, 'Unknown METRICS_MODE, falling back to mock');
  }
  return 'mock';
};

export const createMetricsProvider = (mode?: string): IMetricsProvider => {
  const resolved = normalizeMode(mode ?? process.env.METRICS_MODE);
  if (resolved === 'rpc') {
    return metricsProvider;
  }
  return new MockMetricsProvider();
};
