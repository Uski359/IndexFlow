import { NextFunction, Request, Response } from 'express';

import {
  generateProof,
  scheduleProofSubmission,
  listProofJobs,
  updateProofJob
} from '../services/validatorOpsService.js';
import {
  ProofGenerationPayload,
  ProofSubmissionRequestBody,
  ProofJobUpdate
} from '../types/protocol.js';

export async function generateProofHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as ProofGenerationPayload;
    const result = await generateProof(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function scheduleProofHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as ProofSubmissionRequestBody;
    const job = await scheduleProofSubmission(payload);
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
}

export async function listProofJobsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const jobs = await listProofJobs();
    res.json({ items: jobs });
  } catch (error) {
    next(error);
  }
}

export async function updateProofJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params as { jobId: string };
    const payload = req.body as ProofJobUpdate;
    const job = await updateProofJob(jobId, payload);
    res.json(job);
  } catch (error) {
    next(error);
  }
}
