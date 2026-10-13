import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app: Express;

beforeAll(async () => {
  const module = await import('../../src/app.js');
  app = module.default;
}, 30_000);

describe('v1 campaigns registry endpoint', () => {
  it('lists campaign metadata without returning full target arrays', async () => {
    const response = await request(app).get('/v1/campaigns').expect(200);

    expect(response.body).toMatchObject({
      campaigns: expect.any(Array)
    });
    expect(response.body.campaigns.length).toBeGreaterThan(0);

    const airdropCampaign = response.body.campaigns.find(
      (campaign: { id: string }) => campaign.id === 'airdrop_v1'
    );

    expect(airdropCampaign).toMatchObject({
      id: 'airdrop_v1',
      name: expect.any(String),
      chain_id: expect.any(Number),
      default_window: expect.any(String),
      criteria_set_id_default: expect.any(String),
      criteria_set_ids: expect.any(Array),
      target_count: expect.any(Number)
    });
    expect(airdropCampaign.criteria_set_ids).toContain(
      airdropCampaign.criteria_set_id_default
    );
    expect(airdropCampaign).not.toHaveProperty('targets');
  });

  it('returns 404 for unknown campaign ids on campaign routes', async () => {
    const response = await request(app).get('/v1/campaign/does_not_exist/mock-wallets').expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      message: 'Unknown campaign_id: does_not_exist'
    });
  });
});
