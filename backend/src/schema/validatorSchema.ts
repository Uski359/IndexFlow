import { z } from 'zod';

import { metadataSchema } from './dataSchema.js';

const hex32 = /^0x[a-fA-F0-9]{64}$/;
const addressPattern = /^0x[a-fA-F0-9]{40}$/;

export const proofGenerationSchema = z
  .object({
    datasetId: z.string().min(3),
    validator: z.string().regex(addressPattern, 'validator must be a checksummed address'),
    metadata: metadataSchema,
    expectedSchema: z.record(z.string()).optional(),
    records: z.array(z.record(z.string(), z.any())).optional(),
    csvPayload: z.string().optional(),
    sqlQuery: z.string().optional(),
    chainId: z.number().int().nonnegative().optional(),
    blockNumber: z.number().int().nonnegative().optional()
  })
  .refine((value) => value.records || value.csvPayload, {
    message: 'Either records or csvPayload must be provided',
    path: ['records']
  });

export const proofScheduleSchema = z.object({
  datasetId: z.string().min(3),
  validator: z.string().regex(addressPattern),
  poiHash: z.string().regex(hex32),
  sqlHash: z.string().regex(hex32).optional(),
  targetBlock: z.number().int().nonnegative().optional(),
  chainId: z.number().int().nonnegative().optional(),
  notes: z.string().max(240).optional()
});

export const proofJobUpdateSchema = z.object({
  status: z.enum(['queued', 'processing', 'submitted', 'failed']),
  txHash: z.string().regex(hex32).optional(),
  error: z.string().max(240).optional()
});

export const proofJobParamsSchema = z.object({
  jobId: z.string().min(3)
});
