import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ensResolveCache } from '../../src/services/ensService.js';

const { resolveNameMock } = vi.hoisted(() => ({ resolveNameMock: vi.fn() }));

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();
  return {
    ...actual,
    JsonRpcProvider: class {
      resolveName(name: string) {
        return resolveNameMock(name);
      }
    }
  };
});

let app: Express;

beforeAll(async () => {
  const module = await import('../../src/app.js');
  app = module.default;
}, 30_000);

beforeEach(() => {
  ensResolveCache.clear();
  resolveNameMock.mockReset();
  process.env.RPC_URL_MAINNET = 'https://rpc.example';
});

describe('ENS resolve endpoint', () => {
  it('returns resolved address and caches results', async () => {
    resolveNameMock.mockResolvedValueOnce('0xAbCDEFabcdefABCDEFabcdefabcdefABCDEFab');

    const first = await request(app)
      .get('/v1/ens/resolve')
      .query({ name: 'vitalik.eth' })
      .expect(200);

    expect(first.body).toMatchObject({
      name: 'vitalik.eth',
      address: '0xAbCDEFabcdefABCDEFabcdefabcdefABCDEFab',
      normalized_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefab',
      cached: false,
      error: null
    });

    const second = await request(app)
      .get('/v1/ens/resolve')
      .query({ name: 'vitalik.eth' })
      .expect(200);

    expect(second.body.cached).toBe(true);
    expect(resolveNameMock).toHaveBeenCalledTimes(1);
  });

  it('returns not_found when ENS name has no address', async () => {
    resolveNameMock.mockResolvedValueOnce(null);

    const response = await request(app)
      .get('/v1/ens/resolve')
      .query({ name: 'missing.eth' })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'missing.eth',
      address: null,
      normalized_address: null,
      cached: false,
      error: 'not_found'
    });
  });

  it('returns 400 for invalid ENS names', async () => {
    const response = await request(app)
      .get('/v1/ens/resolve')
      .query({ name: 'not-ens' })
      .expect(400);

    expect(response.body).toMatchObject({ error: 'invalid_name' });
  });

  it('returns rpc_missing when RPC_URL_MAINNET is not configured', async () => {
    delete process.env.RPC_URL_MAINNET;

    const response = await request(app)
      .get('/v1/ens/resolve')
      .query({ name: 'vitalik.eth' })
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'vitalik.eth',
      address: null,
      normalized_address: null,
      cached: false,
      error: 'rpc_missing'
    });
  });
});

