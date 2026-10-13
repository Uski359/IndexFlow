import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getReputationsCollectionMock, getSybilClustersCollectionMock } = vi.hoisted(() => ({
  getReputationsCollectionMock: vi.fn(),
  getSybilClustersCollectionMock: vi.fn()
}));

vi.mock('../../src/infra/indexer/db/mongo.js', () => ({
  getReputationsCollection: getReputationsCollectionMock,
  getSybilClustersCollection: getSybilClustersCollectionMock
}));

import sybilRouter from '../../src/routes/sybil.js';

const app = express();
app.use(express.json());
app.use('/api/v1/sybil', sybilRouter);

const agentAddress = '0x1111111111111111111111111111111111111111';
const relatedReviewer = '0x2222222222222222222222222222222222222222';

describe('POST /api/v1/sybil/check', () => {
  let clusters: Array<{
    wallets: string[];
    fundingSourceAddresses: string[];
    isActive: boolean;
  }>;
  let feedback: Array<{
    reviewer: string;
    weightedScore: number;
    sybilScore: number;
    isSybil: boolean;
  }>;

  beforeEach(() => {
    clusters = [];
    feedback = [];
    getSybilClustersCollectionMock.mockResolvedValue({
      find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue(clusters) }))
    });
    getReputationsCollectionMock.mockResolvedValue({
      find: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue(feedback) }))
    });
  });

  it('rejects invalid addresses without querying MongoDB', async () => {
    const response = await request(app)
      .post('/api/v1/sybil/check')
      .send({ agentAddress: 'not-an-address' })
      .expect(400);

    expect(response.body).toMatchObject({ error: expect.stringContaining('valid EVM address') });
    expect(getSybilClustersCollectionMock).not.toHaveBeenCalled();
  });

  it('returns normalized risk and the weighted reviewer score', async () => {
    feedback = [
      { reviewer: agentAddress, weightedScore: 85, sybilScore: 0.15, isSybil: false }
    ];

    const response = await request(app)
      .post('/api/v1/sybil/check')
      .send({ agentAddress: agentAddress.toUpperCase().replace('0X', '0x') })
      .expect(200);

    expect(response.body).toEqual({
      agentAddress,
      riskScore: 15,
      reputationScore: 85,
      isSybil: false
    });
  });

  it('includes related cluster reviewers and marks known cluster wallets as Sybil', async () => {
    clusters = [
      {
        wallets: [agentAddress, relatedReviewer],
        fundingSourceAddresses: [],
        isActive: true
      }
    ];
    feedback = [
      { reviewer: relatedReviewer, weightedScore: 20, sybilScore: 0.9, isSybil: true }
    ];

    const response = await request(app)
      .post('/api/v1/sybil/check')
      .send({ agentAddress })
      .expect(200);

    expect(response.body).toEqual({
      agentAddress,
      riskScore: 100,
      reputationScore: 20,
      isSybil: true
    });
  });

  it('omits reputationScore when no feedback exists', async () => {
    const response = await request(app)
      .post('/api/v1/sybil/check')
      .send({ agentAddress })
      .expect(200);

    expect(response.body).toEqual({ agentAddress, riskScore: 0, isSybil: false });
  });
});