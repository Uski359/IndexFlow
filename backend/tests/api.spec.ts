import type { Express } from 'express';
import request from 'supertest';
import { Wallet } from 'ethers';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { TestDatabase } from './utils/db.js';
import { setupTestDatabase } from './utils/db.js';

let app: Express;
let testDb: TestDatabase;
const validatorWallet = Wallet.createRandom();

beforeAll(async () => {
  const module = await import('../src/app.js');
  app = module.default;
});

beforeEach(async () => {
  testDb = await setupTestDatabase();
});

afterEach(async () => {
  await testDb.cleanup();
});

describe('IndexFlow backend API', () => {
  it('submits datasets, retrieves them, and processes verification callbacks', async () => {
    const payload = {
      metadata: {
        name: 'Ethereum Transactions',
        description: 'Daily transaction aggregates for Ethereum mainnet.',
        tags: ['ethereum', 'transactions'],
        datasetType: 'on-chain',
        sizeInMb: 512
      },
      submitter: '0xabc123456789',
      stakeAmount: 1500
    };

    const submitResponse = await request(app).post('/api/data/submit').send(payload).expect(201);
    expect(submitResponse.body).toMatchObject({
      dataset: {
        id: expect.any(String),
        status: 'pending',
        metadata: payload.metadata
      },
      stakeRequired: payload.stakeAmount,
      estimatedReward: expect.any(Number)
    });

    const datasetId = submitResponse.body.dataset.id as string;

    const listResponse = await request(app).get('/api/data').expect(200);
    expect(listResponse.body.items).toHaveLength(1);

    const getResponse = await request(app).get(`/api/data/${datasetId}`).expect(200);
    expect(getResponse.body.status).toBe('pending');

    const callbackPayload = {
      entryId: datasetId,
      verifier: validatorWallet.address,
      verdict: 'approved',
      qualityScore: 0.92,
      notes: 'All checks passed'
    };

    const signature = await validatorWallet.signMessage(JSON.stringify(callbackPayload));

    await request(app)
      .post('/api/verify/callback')
      .set('x-validator-address', validatorWallet.address)
      .set('x-validator-signature', signature)
      .send(callbackPayload)
      .expect(200);

    const afterVerification = await request(app).get(`/api/data/${datasetId}`).expect(200);
    expect(afterVerification.body.status).toBe('indexed');
    expect(afterVerification.body.qualityScore).toBeCloseTo(0.92, 2);
  });

  it('creates staking positions, lists them, and supports unstaking', async () => {
    const stakePayload = {
      address: '0xfeedface0001',
      amount: 1_000,
      stakeType: 'active',
      lockDays: 30
    };

    const stakeResponse = await request(app).post('/api/stake').send(stakePayload).expect(201);
    expect(stakeResponse.body).toMatchObject({
      id: expect.any(String),
      address: stakePayload.address.toLowerCase(),
      type: 'active'
    });

    const listResponse = await request(app)
      .get('/api/stake')
      .query({ address: stakePayload.address })
      .expect(200);
    expect(listResponse.body.items).toHaveLength(1);

    await request(app)
      .post('/api/stake/unstake')
      .send({ stakeId: stakeResponse.body.id })
      .expect(200);

    const afterUnstake = await request(app)
      .get('/api/stake')
      .query({ address: stakePayload.address })
      .expect(200);
    expect(afterUnstake.body.items).toHaveLength(0);
  });

  it('records challenges and transitions dataset status', async () => {
    const datasetResponse = await request(app)
      .post('/api/data/submit')
      .send({
        metadata: {
          name: 'Validator Metrics',
          description: 'Daily validator performance snapshots.',
          tags: ['validators'],
          datasetType: 'off-chain',
          sizeInMb: 128
        },
        submitter: '0x0b54d',
        stakeAmount: 500
      })
      .expect(201);

    const challengeResponse = await request(app)
      .post('/api/challenge')
      .send({
        entryId: datasetResponse.body.dataset.id,
        challenger: '0xdefcafe',
        reason: 'Data latency exceeds SLA expectations by 24h',
        bond: 250
      })
      .expect(201);

    expect(challengeResponse.body).toMatchObject({
      id: expect.any(String),
      status: 'pending',
      entryId: datasetResponse.body.dataset.id
    });

    const datasetAfter = await request(app)
      .get(`/api/data/${datasetResponse.body.dataset.id}`)
      .expect(200);
    expect(datasetAfter.body.status).toBe('challenged');
  });

  it('aggregates reward summaries per account', async () => {
    const submitResponse = await request(app)
      .post('/api/data/submit')
      .send({
        metadata: {
          name: 'Polygon Blocks',
          description: 'Block level metrics for Polygon POS.',
          tags: ['polygon', 'blocks'],
          datasetType: 'on-chain',
          sizeInMb: 300
        },
        submitter: '0xdeadbeefacdc',
        stakeAmount: 1200
      })
      .expect(201);

    const callbackPayload = {
      entryId: submitResponse.body.dataset.id,
      verifier: validatorWallet.address,
      verdict: 'approved',
      qualityScore: 0.88
    };

    const signature = await validatorWallet.signMessage(JSON.stringify(callbackPayload));

    await request(app)
      .post('/api/verify/callback')
      .set('x-validator-address', validatorWallet.address)
      .set('x-validator-signature', signature)
      .send(callbackPayload)
      .expect(200);

    const stakeResponse = await request(app)
      .post('/api/stake')
      .send({
        address: '0xdeadbeefacdc',
        amount: 2_500,
        stakeType: 'passive',
        lockDays: 60
      })
      .expect(201);

    await testDb.pool.query(
      'UPDATE protocol_stakes SET rewards_to_claim = $1 WHERE id = $2',
      [42.5, stakeResponse.body.id]
    );

    const distributionResponse = await request(app)
      .post('/api/rewards/distribute')
      .set('x-admin-wallet', '0xdeadbeefacdc')
      .send({
        datasetId: submitResponse.body.dataset.id,
        recipient: '0xdeadbeefacdc',
        amount: 320.5
      })
      .expect(201);

    expect(distributionResponse.body).toMatchObject({
      id: expect.any(String),
      datasetId: submitResponse.body.dataset.id,
      recipient: '0xdeadbeefacdc',
      amount: 320.5
    });

    const rewardSummary = await request(app)
      .get('/api/rewards')
      .query({ address: '0xdeadbeefacdc' })
      .expect(200);

    expect(rewardSummary.body.pending).toBeCloseTo(42.5);
    expect(rewardSummary.body.lifetime).toBeCloseTo(320.5);
    expect(rewardSummary.body.latestDistributions).toHaveLength(1);

    const claimResponse = await request(app)
      .post('/api/rewards/claim')
      .send({ address: '0xdeadbeefacdc' })
      .expect(200);

    expect(claimResponse.body.pending).toBe(0);
    expect(claimResponse.body.address).toBe('0xdeadbeefacdc');
  });

  it('requires an admin wallet header for admin endpoints', async () => {
    await request(app).get('/api/admin/parameters').expect(401);
    await request(app).post('/api/admin/parameters').send({
      baseReward: 180,
      challengeBond: 600,
      validatorQuorum: 0.72,
      slashPercentage: 0.28
    }).expect(401);

    await request(app).get('/api/admin/oracle').expect(401);
    await request(app).post('/api/admin/oracle').send({ url: 'https://oracle.example' }).expect(401);
  });

  it('updates protocol admin parameters and oracle endpoint', async () => {
    const adminWallet = '0xdeadbeefacdc';

    const initialParameters = await request(app)
      .get('/api/admin/parameters')
      .set('x-admin-wallet', adminWallet)
      .expect(200);

    expect(initialParameters.body).toMatchObject({
      baseReward: expect.any(Number),
      challengeBond: expect.any(Number),
      validatorQuorum: expect.any(Number),
      slashPercentage: expect.any(Number),
      updatedAt: expect.any(String)
    });

    const updatePayload = {
      baseReward: 210,
      challengeBond: 640,
      validatorQuorum: 0.7,
      slashPercentage: 0.3
    };

    const updatedParameters = await request(app)
      .post('/api/admin/parameters')
      .set('x-admin-wallet', adminWallet)
      .send(updatePayload)
      .expect(200);

    expect(updatedParameters.body).toMatchObject({
      ...updatePayload,
      updatedAt: expect.any(String)
    });

    const oracleUrl = 'https://oracle.indexflow.dev';
    const updatedOracle = await request(app)
      .post('/api/admin/oracle')
      .set('x-admin-wallet', adminWallet)
      .send({ url: oracleUrl })
      .expect(200);

    expect(updatedOracle.body).toMatchObject({
      oracleUrl,
      updatedAt: expect.any(String)
    });

    const fetchedOracle = await request(app)
      .get('/api/admin/oracle')
      .set('x-admin-wallet', adminWallet)
      .expect(200);

    expect(fetchedOracle.body).toMatchObject({
      oracleUrl,
      updatedAt: expect.any(String)
    });
  });

  describe('validator operations', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;

    afterEach(() => {
      fetchSpy?.mockRestore();
      fetchSpy = undefined;
    });

    it('generates proofs via the validator microservice proxy', async () => {
      const generatedAt = new Date().toISOString();
      const proofResponse = {
        dataset_id: 'dataset-123',
        validator: '0xabc123456789abcdef000000000000000000abcd',
        dataset_hash: '0x1234',
        poi_hash: '0x5678',
        sql_hash: null,
        row_count: 42,
        warnings: ['sample truncated'],
        generated_at: generatedAt
      };

      fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValue({ ok: true, json: async () => proofResponse } as unknown as Response);

      const requestBody = {
        datasetId: proofResponse.dataset_id,
        validator: proofResponse.validator,
        metadata: {
          name: 'Validator Dataset',
          description: 'Test dataset',
          tags: ['test'],
          datasetType: 'on-chain',
          sizeInMb: 1
        },
        records: [{ id: 1 }]
      };

      const res = await request(app).post('/api/validator/proof').send(requestBody).expect(201);

      expect(res.body).toMatchObject({
        datasetId: proofResponse.dataset_id,
        validator: proofResponse.validator,
        datasetHash: proofResponse.dataset_hash,
        poiHash: proofResponse.poi_hash,
        rowCount: proofResponse.row_count,
        warnings: proofResponse.warnings
      });
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('schedules proof submissions and updates job status', async () => {
      const queuedAt = new Date().toISOString();
      const jobResponse = {
        job_id: 'job-1',
        dataset_id: 'dataset-xyz',
        validator: '0xabc123456789abcdef000000000000000000abcd',
        poi_hash: '0x' + 'a'.repeat(64),
        sql_hash: null,
        status: 'queued',
        queued_at: queuedAt,
        target_block: null,
        chain_id: null,
        notes: null,
        tx_hash: null,
        error: null
      };

      fetchSpy = vi
        .spyOn(global, 'fetch')
        .mockResolvedValueOnce({ ok: true, json: async () => jobResponse } as unknown as Response)
        .mockResolvedValueOnce({ ok: true, json: async () => [jobResponse] } as unknown as Response)
        .mockResolvedValueOnce(
          {
            ok: true,
            json: async () => ({
              ...jobResponse,
              status: 'submitted',
              tx_hash: '0x' + 'b'.repeat(64)
            })
          } as unknown as Response
        );

      const schedulePayload = {
        datasetId: jobResponse.dataset_id,
        validator: jobResponse.validator,
        poiHash: jobResponse.poi_hash
      };

      const scheduleRes = await request(app)
        .post('/api/validator/proof/schedule')
        .send(schedulePayload)
        .expect(201);

      expect(scheduleRes.body).toMatchObject({
        jobId: jobResponse.job_id,
        status: 'queued'
      });

      const listRes = await request(app).get('/api/validator/jobs').expect(200);
      expect(listRes.body.items).toHaveLength(1);
      expect(listRes.body.items[0]).toMatchObject({ jobId: jobResponse.job_id });

      const updateRes = await request(app)
        .patch(`/api/validator/jobs/${jobResponse.job_id}`)
        .send({ status: 'submitted', txHash: '0x' + 'c'.repeat(64) })
        .expect(200);

      expect(updateRes.body.status).toBe('submitted');
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });
  });
});
