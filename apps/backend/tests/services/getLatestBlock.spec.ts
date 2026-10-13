import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveRpcEnvKey,
  resolveRpcEnvKeys,
  resolveRpcUrl
} from '../../src/infra/rpc/getLatestBlock.js';

const TEST_ENV_KEYS = [
  'RPC_URL_MAINNET',
  'ETHEREUM_RPC',
  'ETHEREUM_RPC_1',
  'RPC_URL',
  'RPC_URL_SEPOLIA',
  'SEPOLIA_RPC',
  'SEPOLIA_RPC_1'
] as const;

const clearTestEnv = () => {
  for (const key of TEST_ENV_KEYS) {
    delete process.env[key];
  }
};

afterEach(() => {
  clearTestEnv();
});

describe('resolveRpcUrl', () => {
  it('prefers new RPC_URL_* variables when multiple keys exist', () => {
    process.env.RPC_URL_MAINNET = 'https://mainnet-new.example';
    process.env.ETHEREUM_RPC = 'https://mainnet-legacy.example';

    expect(resolveRpcUrl(1)).toBe('https://mainnet-new.example');
  });

  it('falls back to legacy chain RPC variables', () => {
    process.env.SEPOLIA_RPC = 'https://sepolia-legacy.example';

    expect(resolveRpcUrl(11155111)).toBe('https://sepolia-legacy.example');
  });

  it('falls back to pooled legacy key when primary legacy key is missing', () => {
    process.env.SEPOLIA_RPC_1 = 'https://sepolia-pool.example';

    expect(resolveRpcUrl(11155111)).toBe('https://sepolia-pool.example');
  });
});

describe('resolveRpcEnvKey helpers', () => {
  it('returns the primary key for a chain', () => {
    expect(resolveRpcEnvKey(11155111)).toBe('RPC_URL_SEPOLIA');
    expect(resolveRpcEnvKey(1)).toBe('RPC_URL_MAINNET');
  });

  it('returns an empty key list for unknown chains', () => {
    expect(resolveRpcEnvKey(999999)).toBeUndefined();
    expect(resolveRpcEnvKeys(999999)).toEqual([]);
  });
});
