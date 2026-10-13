import { z } from 'zod';

export const metadataSchema = z.object({
  name: z.string().min(3).max(120),
  description: z.string().min(10).max(500),
  tags: z.array(z.string().min(1)).min(1).max(12),
  datasetType: z.enum(['on-chain', 'off-chain']),
  source: z.string().min(2).max(120).optional(),
  sizeInMb: z.number().min(1)
});

export const submitDatasetSchema = z.object({
  metadata: metadataSchema,
  submitter: z.string().min(4),
  stakeAmount: z.number().min(0),
  dataFormat: z.enum(['json', 'csv', 'parquet']).optional(),
  sample: z.string().min(1).optional(),
  expectedSchema: z.record(z.string().min(1)).optional(),
  sqlQuery: z.string().min(1).max(5000).optional()
});

export const verificationSchema = z.object({
  entryId: z.string().min(3),
  verifier: z.string().min(4),
  verdict: z.enum(['approved', 'rejected']),
  qualityScore: z.number().min(0).max(1),
  notes: z.string().optional(),
  sqlHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'sqlHash must be a 32-byte hex string')
    .optional(),
  poiHash: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'poiHash must be a 32-byte hex string')
    .optional()
});

export const datasetIdSchema = z.object({
  id: z.string().min(3)
});
