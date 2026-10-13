import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const clearFaucetEnv = () => {
  delete process.env.FAUCET_PRIVATE_KEY;
  delete process.env.RPC_URL;
  delete process.env.TOKEN_ADDRESS;
  delete process.env.TOKEN_DECIMALS;
};

describe('Faucet route bootstrapping', () => {
  let app: Express;

  beforeEach(async () => {
    vi.resetModules();
    clearFaucetEnv();
    const module = await import('../../src/app.js');
    app = module.default;
  }, 30_000);

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('boots without faucet env vars', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });
});

