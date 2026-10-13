import { z } from 'zod';

export const updateParametersSchema = z.object({
  baseReward: z.number().positive(),
  challengeBond: z.number().min(0),
  validatorQuorum: z.number().min(0).max(1),
  slashPercentage: z.number().min(0).max(1)
});

export const updateOracleSchema = z.object({
  url: z.string().url()
});


export const registerDatasetSchema = z.object({
  datasetId: z.string().min(1),
  contractDatasetId: z.number().int().positive(),
  contentHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional()
});
