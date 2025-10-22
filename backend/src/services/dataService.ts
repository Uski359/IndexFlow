import { randomUUID } from 'crypto';
import createHttpError from 'http-errors';

import {
  createDataset as createDatasetRecord,
  getDatasetById as fetchDatasetById,
  insertVerification,
  listDatasets as listDatasetRecords,
  setDatasetContractInfo,
  updateDataset
} from '../repositories/datasetRepository.js';
import { config } from '../config/env.js';
import { Dataset, VerificationResult, ValidatorSummary } from '../types/protocol.js';
import { createNotFoundError } from '../utils/httpError.js';
import { indexDatasetDocument } from './elasticService.js';
import { postValidator } from './validatorClient.js';

export async function listDatasets(): Promise<Dataset[]> {
  return listDatasetRecords();
}

export async function getDatasetById(id: string): Promise<Dataset> {
  const dataset = await fetchDatasetById(id);
  if (!dataset) {
    throw createNotFoundError('Dataset', id);
  }
  return dataset;
}

export interface SubmitDatasetInput {
  metadata: Dataset['metadata'];
  submitter: string;
  stakeAmount: number;
  dataFormat?: 'json' | 'csv' | 'parquet';
  sample?: string;
  expectedSchema?: Record<string, string>;
  sqlQuery?: string;
}

interface ValidationSummary {
  valid: boolean;
  datasetHash: string;
  sqlHash?: string;
  issues: string[];
  inferredSchema: Record<string, string>;
  rowCount: number;
}

function normalizeSample(
  sample: string,
  format: SubmitDatasetInput['dataFormat']
): { records?: unknown[]; csvPayload?: string } {
  const trimmed = sample.trim();
  if (!trimmed) {
    throw createHttpError(400, 'Sample payload cannot be empty.');
  }

  if (format === 'csv') {
    return { csvPayload: trimmed };
  }

  try {
    const parsed = JSON.parse(trimmed);
    const records = Array.isArray(parsed) ? parsed : [parsed];
    if (records.length === 0) {
      throw new Error('Sample must contain at least one record.');
    }
    return { records };
  } catch (error) {
    throw createHttpError(
      400,
      'Sample must be valid JSON (array or object) when using JSON/Parquet formats.'
    );
  }
}

async function runValidator(input: SubmitDatasetInput): Promise<ValidationSummary | undefined> {
  if (!config.dataValidatorUrl || !input.sample) {
    return undefined;
  }

  const payload: Record<string, unknown> = {
    metadata: {
      name: input.metadata.name,
      dataset_type: input.metadata.datasetType,
      source: input.metadata.source,
      tags: input.metadata.tags
    }
  };

  if (input.expectedSchema) {
    payload.expected_schema = input.expectedSchema;
  }
  if (input.sqlQuery) {
    payload.sql_query = input.sqlQuery;
  }

  const normalized = normalizeSample(input.sample, input.dataFormat ?? 'json');
  if (normalized.records) {
    payload.records = normalized.records;
  }
  if (normalized.csvPayload) {
    payload.csv_payload = normalized.csvPayload;
  }

  type ValidatorResponse = {
    valid: boolean;
    dataset_hash: string;
    sql_hash?: string | null;
    issues?: unknown;
    inferred_schema?: Record<string, string>;
    row_count?: number;
  };

  const result = await postValidator<ValidatorResponse>('/validate', payload);

  const issues = Array.isArray(result.issues) ? result.issues.map(String) : [];

  return {
    valid: Boolean(result.valid),
    datasetHash: result.dataset_hash,
    sqlHash: result.sql_hash ?? undefined,
    issues,
    inferredSchema: result.inferred_schema ?? {},
    rowCount: Number(result.row_count ?? 0)
  };
}

export async function submitDataset(
  input: SubmitDatasetInput
): Promise<{ dataset: Dataset; stakeRequired: number; estimatedReward: number; validation?: ValidationSummary }> {
  const validation = await runValidator(input);

  const now = new Date().toISOString();

  const dataset: Dataset = {
    id: `dataset-${randomUUID()}`,
    hash: validation?.datasetHash ?? `0x${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    sqlHash: validation?.sqlHash ?? null,
    metadata: input.metadata,
    status: 'pending',
    reward: estimateReward(input),
    qualityScore: 0.8,
    reputationMultiplier: 1,
    stakeBoost: Math.min(1 + input.stakeAmount / 10_000, 1.3),
    updatedAt: now,
    submitter: input.submitter.toLowerCase(),
    validatorSummary: validation
      ? {
          valid: validation.valid,
          datasetHash: validation.datasetHash,
          sqlHash: validation.sqlHash,
          issues: validation.issues,
          inferredSchema: validation.inferredSchema,
          rowCount: validation.rowCount
        }
      : null,
    validatedAt: validation ? now : null
  };

  const created = await createDatasetRecord(dataset);
  await indexDatasetDocument(created);

  return {
    dataset: created,
    stakeRequired: Math.ceil(input.stakeAmount),
    estimatedReward: created.reward,
    validation
  };
}

export interface VerificationInput {
  entryId: string;
  verifier: string;
  verdict: VerificationResult['verdict'];
  qualityScore: number;
  notes?: string;
  sqlHash?: string;
  poiHash?: string;
}

export async function recordVerification(input: VerificationInput) {
  const existing = await fetchDatasetById(input.entryId);
  if (!existing) {
    throw createNotFoundError('Dataset', input.entryId);
  }

  const verification: VerificationResult = {
    entryId: input.entryId,
    verifier: input.verifier.toLowerCase(),
    verdict: input.verdict,
    qualityScore: input.qualityScore,
    notes: input.notes,
    processedAt: new Date().toISOString()
  };

  await insertVerification(verification);

  const validatorSummary: ValidatorSummary = {
    valid: input.verdict === 'approved',
    datasetHash: existing.validatorSummary?.datasetHash ?? existing.hash,
    sqlHash: input.sqlHash ?? existing.sqlHash ?? existing.validatorSummary?.sqlHash ?? undefined,
    poiHash: input.poiHash ?? existing.validatorSummary?.poiHash,
    issues: existing.validatorSummary?.issues ?? [],
    inferredSchema: existing.validatorSummary?.inferredSchema ?? {},
    rowCount: existing.validatorSummary?.rowCount ?? 0
  };

  const datasetUpdates: Partial<
    Pick<Dataset, 'status' | 'qualityScore' | 'updatedAt' | 'validatorSummary' | 'validatedAt' | 'sqlHash'>
  > = {
    status: input.verdict === 'approved' ? 'indexed' : 'rejected',
    qualityScore: input.qualityScore,
    updatedAt: verification.processedAt,
    validatorSummary,
    validatedAt: verification.processedAt
  };

  if (input.sqlHash) {
    datasetUpdates.sqlHash = input.sqlHash;
  }

  const updatedDataset = await updateDataset(input.entryId, datasetUpdates);

  if (!updatedDataset) {
    throw createNotFoundError('Dataset', input.entryId);
  }

  await indexDatasetDocument(updatedDataset);

  return { dataset: updatedDataset, verification };
}

export interface RegisterDatasetInput {
  datasetId: string;
  contractDatasetId: number;
  contentHash?: string;
}

export async function registerDatasetOnChain(input: RegisterDatasetInput): Promise<Dataset> {
  const updated = await setDatasetContractInfo(
    input.datasetId,
    input.contractDatasetId,
    input.contentHash
  );
  if (!updated) {
    throw createNotFoundError('Dataset', input.datasetId);
  }

  return updated;
}

function estimateReward(input: SubmitDatasetInput) {
  const baseReward = input.metadata.datasetType === 'on-chain' ? 240 : 180;
  const sizeFactor = Math.min(Math.log10(Math.max(input.metadata.sizeInMb, 1)) + 1, 3);
  const stakeBoost = Math.min(1 + input.stakeAmount / 10_000, 1.25);
  return Math.round(baseReward * sizeFactor * stakeBoost);
}
