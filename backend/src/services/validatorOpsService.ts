import { config } from '../config/env.js';
import {
  ProofGenerationPayload,
  ProofGenerationResult,
  ProofJobUpdate,
  ProofSubmissionJob,
  ProofSubmissionRequestBody
} from '../types/protocol.js';
import { callValidator, postValidator } from './validatorClient.js';

interface ProofGenerationApiResponse {
  dataset_id?: string;
  validator?: string;
  dataset_hash: string;
  poi_hash: string;
  sql_hash?: string | null;
  row_count?: number;
  warnings?: unknown;
  generated_at?: string;
}

interface ProofJobApiResponse {
  job_id: string;
  dataset_id: string;
  validator: string;
  poi_hash: string;
  sql_hash?: string | null;
  status: ProofSubmissionJob['status'];
  queued_at: string;
  target_block?: number | null;
  chain_id?: number | null;
  notes?: string | null;
  tx_hash?: string | null;
  error?: string | null;
  retries?: number | null;
  last_attempt?: string | null;
}

function toValidatorMetadata(metadata: ProofGenerationPayload['metadata']) {
  return {
    name: metadata.name,
    dataset_type: metadata.datasetType,
    source: metadata.source,
    tags: metadata.tags
  };
}

function mapProofGenerationResult(
  payload: ProofGenerationPayload,
  raw: ProofGenerationApiResponse
): ProofGenerationResult {
  return {
    datasetId: raw.dataset_id ?? payload.datasetId,
    validator: raw.validator ?? payload.validator,
    datasetHash: raw.dataset_hash,
    poiHash: raw.poi_hash,
    sqlHash: raw.sql_hash ?? null,
    rowCount: Number(raw.row_count ?? 0),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
    generatedAt: typeof raw.generated_at === 'string' ? raw.generated_at : new Date().toISOString()
  };
}

function mapProofJob(raw: ProofJobApiResponse): ProofSubmissionJob {
  return {
    jobId: raw.job_id,
    datasetId: raw.dataset_id,
    validator: raw.validator,
    poiHash: raw.poi_hash,
    sqlHash: raw.sql_hash ?? null,
    status: raw.status,
    queuedAt: raw.queued_at,
    targetBlock: raw.target_block ?? null,
    chainId: raw.chain_id ?? null,
    notes: raw.notes ?? null,
    txHash: raw.tx_hash ?? null,
    error: raw.error ?? null,
    retries: raw.retries ?? 0,
    lastAttempt: raw.last_attempt ?? null
  };
}

export async function generateProof(payload: ProofGenerationPayload): Promise<ProofGenerationResult> {
  const targetChainId = payload.chainId ?? config.chainId;
  const body = {
    dataset_id: payload.datasetId,
    validator: payload.validator,
    metadata: toValidatorMetadata(payload.metadata),
    expected_schema: payload.expectedSchema,
    records: payload.records,
    csv_payload: payload.csvPayload,
    sql_query: payload.sqlQuery,
    chain_id: targetChainId,
    block_number: payload.blockNumber
  };

  const result = await postValidator<ProofGenerationApiResponse>('/proof/generate', body);

  return mapProofGenerationResult(payload, result);
}

export async function scheduleProofSubmission(
  payload: ProofSubmissionRequestBody
): Promise<ProofSubmissionJob> {
  const targetChainId = payload.chainId ?? config.chainId;
  const body = {
    dataset_id: payload.datasetId,
    validator: payload.validator,
    poi_hash: payload.poiHash,
    sql_hash: payload.sqlHash,
    target_block: payload.targetBlock,
    chain_id: targetChainId,
    notes: payload.notes
  };

  const job = await postValidator<ProofJobApiResponse>('/proof/schedule', body);

  return mapProofJob(job);
}

export async function listProofJobs(): Promise<ProofSubmissionJob[]> {
  const jobs = await callValidator<ProofJobApiResponse[]>('/proof/jobs');
  return jobs.map(mapProofJob);
}

export async function updateProofJob(
  jobId: string,
  payload: ProofJobUpdate
): Promise<ProofSubmissionJob> {
  const body = {
    status: payload.status,
    tx_hash: payload.txHash,
    error: payload.error
  };

  const job = await callValidator<ProofJobApiResponse>(`/proof/jobs/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });

  return mapProofJob(job);
}
