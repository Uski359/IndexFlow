import { NextFunction, Request, Response } from 'express';

import {
  SubmitDatasetInput,
  getDatasetById,
  listDatasets,
  recordVerification,
  submitDataset
} from '../services/dataService.js';

export async function listDatasetsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const items = await listDatasets();
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function submitDatasetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as SubmitDatasetInput;
    const result = await submitDataset(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDatasetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dataset = await getDatasetById(req.params.id);
    res.json(dataset);
  } catch (error) {
    next(error);
  }
}

export async function verificationCallbackHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataset, verification } = await recordVerification(req.body);
    res.json({ dataset, verification });
  } catch (error) {
    next(error);
  }
}
