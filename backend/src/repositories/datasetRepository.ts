import { randomUUID } from 'crypto';
import { Pool } from 'pg';

import { getPool } from '../db/postgres.js';
import { Dataset, DatasetStatus, ValidatorSummary, VerificationResult } from '../types/protocol.js';

interface DatasetRow {
  id: string;
  hash: string;
  metadata: Dataset['metadata'];
  status: DatasetStatus;
  reward: string | number;
  quality_score: string | number;
  reputation_multiplier: string | number;
  stake_boost: string | number;
  updated_at: string | Date;
  submitter: string;
  sql_hash: string | null;
  validator_summary: ValidatorSummary | null;
  validated_at: string | Date | null;
}

const DATASET_FIELDS = `
  id,
  hash,
  metadata,
  status,
  reward,
  quality_score,
  reputation_multiplier,
  stake_boost,
  updated_at,
  submitter,
  sql_hash,
  validator_summary,
  validated_at
`;

function mapDataset(row: DatasetRow): Dataset {
  return {
    id: row.id,
    hash: row.hash,
    sqlHash: row.sql_hash,
    metadata: row.metadata,
    status: row.status,
    reward: Number(row.reward),
    qualityScore: Number(row.quality_score),
    reputationMultiplier: Number(row.reputation_multiplier),
    stakeBoost: Number(row.stake_boost),
    updatedAt: new Date(row.updated_at).toISOString(),
    submitter: row.submitter,
    validatorSummary: row.validator_summary ?? null,
    validatedAt: row.validated_at ? new Date(row.validated_at).toISOString() : null
  };
}

function getClient(): Pool {
  return getPool();
}

export async function createDataset(dataset: Dataset): Promise<Dataset> {
  const client = getClient();
  const { rows } = await client.query<DatasetRow>(
    `
      INSERT INTO protocol_datasets (
        id,
        hash,
        metadata,
        status,
        reward,
        quality_score,
      reputation_multiplier,
      stake_boost,
      updated_at,
      submitter,
      sql_hash,
      validator_summary,
      validated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10, $11, $12::jsonb, $13::timestamptz)
      RETURNING ${DATASET_FIELDS}
    `,
    [
      dataset.id,
      dataset.hash,
      dataset.metadata,
      dataset.status,
      dataset.reward,
      dataset.qualityScore,
      dataset.reputationMultiplier,
      dataset.stakeBoost,
      dataset.updatedAt,
      dataset.submitter,
      dataset.sqlHash ?? null,
      dataset.validatorSummary ?? null,
      dataset.validatedAt ?? null
    ]
  );

  return mapDataset(rows[0]);
}

export async function updateDataset(
  datasetId: string,
  updates: Partial<
    Pick<Dataset, 'status' | 'qualityScore' | 'updatedAt' | 'sqlHash' | 'validatorSummary' | 'validatedAt'>
  >
): Promise<Dataset | null> {
  const client = getClient();
  const fields: string[] = [];
  const values: Array<string | number | Date | null | ValidatorSummary> = [];

  if (updates.status) {
    fields.push(`status = $${fields.length + 1}`);
    values.push(updates.status);
  }
  if (typeof updates.qualityScore === 'number') {
    fields.push(`quality_score = $${fields.length + 1}`);
    values.push(updates.qualityScore);
  }
  if (updates.updatedAt) {
    fields.push(`updated_at = $${fields.length + 1}::timestamptz`);
    values.push(updates.updatedAt);
  }
  if (updates.sqlHash !== undefined) {
    fields.push(`sql_hash = $${fields.length + 1}`);
    values.push(updates.sqlHash ?? null);
  }
  if (updates.validatorSummary !== undefined) {
    fields.push(`validator_summary = $${fields.length + 1}::jsonb`);
    values.push(updates.validatorSummary ?? null);
  }
  if (updates.validatedAt !== undefined) {
    fields.push(`validated_at = $${fields.length + 1}::timestamptz`);
    values.push(updates.validatedAt ?? null);
  }

  if (fields.length === 0) {
    return getDatasetById(datasetId);
  }

  values.push(datasetId);

  const { rows } = await client.query<DatasetRow>(
    `
      UPDATE protocol_datasets
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING ${DATASET_FIELDS}
    `,
    values
  );

  if (rows.length === 0) {
    return null;
  }

  return mapDataset(rows[0]);
}

export async function setDatasetContractInfo(
  datasetId: string,
  contractDatasetId: number,
  contentHash?: string
): Promise<Dataset | null> {
  const client = getClient();
  const setClauses = [
    `metadata = jsonb_set(metadata, '{contractDatasetId}', to_jsonb($1::int), true)`
  ];
  const values: Array<string | number> = [contractDatasetId];

  if (contentHash) {
    setClauses.push(`hash = $${values.length + 1}`);
    values.push(contentHash);
  }

  values.push(datasetId);

  const { rows } = await client.query<DatasetRow>(
    `
      UPDATE protocol_datasets
      SET ${setClauses.join(', ')}
      WHERE id = $${contentHash ? 3 : 2}
      RETURNING ${DATASET_FIELDS}
    `,
    values
  );

  if (rows.length === 0) {
    return null;
  }

  return mapDataset(rows[0]);
}

export async function getDatasetById(datasetId: string): Promise<Dataset | null> {
  const client = getClient();
  const { rows } = await client.query<DatasetRow>(
    `SELECT ${DATASET_FIELDS} FROM protocol_datasets WHERE id = $1`,
    [datasetId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapDataset(rows[0]);
}

export async function listDatasets(): Promise<Dataset[]> {
  const client = getClient();
  const { rows } = await client.query<DatasetRow>(
    `SELECT ${DATASET_FIELDS} FROM protocol_datasets ORDER BY updated_at DESC`
  );
  return rows.map(mapDataset);
}

export async function searchDatasetsByQuery(query: string, limit = 20): Promise<Dataset[]> {
  const client = getClient();
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    const { rows } = await client.query<DatasetRow>(
      `SELECT ${DATASET_FIELDS} FROM protocol_datasets ORDER BY updated_at DESC LIMIT $1`,
      [limit]
    );
    return rows.map(mapDataset);
  }

  const term = `%${trimmed}%`;
  const { rows } = await client.query<DatasetRow>(
    `
      SELECT ${DATASET_FIELDS}
      FROM protocol_datasets
      WHERE LOWER(metadata->>'name') LIKE $1
         OR LOWER(metadata->>'description') LIKE $1
         OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(metadata->'tags') AS tag
              WHERE LOWER(tag) LIKE $1
         )
      ORDER BY updated_at DESC
      LIMIT $2
    `,
    [term, limit]
  );

  return rows.map(mapDataset);
}

export async function insertVerification(
  verification: VerificationResult
): Promise<VerificationResult> {
  const client = getClient();
  await client.query(
    `
      INSERT INTO protocol_verifications (
        id,
        dataset_id,
        verifier,
        verdict,
        quality_score,
        notes,
        processed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
    `,
    [
      `verification-${randomUUID()}`,
      verification.entryId,
      verification.verifier,
      verification.verdict,
      verification.qualityScore,
      verification.notes ?? null,
      verification.processedAt
    ]
  );

  return verification;
}
