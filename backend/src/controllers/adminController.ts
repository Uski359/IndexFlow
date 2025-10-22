import createHttpError from 'http-errors';
import { NextFunction, Request, Response } from 'express';

import {
  fetchAdminSettings,
  updateAdminOracle,
  updateAdminParameters
} from '../services/adminService.js';
import { RegisterDatasetInput, registerDatasetOnChain } from '../services/dataService.js';

export async function getParametersHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await fetchAdminSettings();
    res.json({
      baseReward: settings.baseReward,
      challengeBond: settings.challengeBond,
      validatorQuorum: settings.validatorQuorum,
      slashPercentage: settings.slashPercentage,
      updatedAt: settings.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

export async function updateParametersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as Partial<{
      baseReward: number;
      challengeBond: number;
      validatorQuorum: number;
      slashPercentage: number;
    }>;

    if (
      payload.baseReward === undefined ||
      payload.challengeBond === undefined ||
      payload.validatorQuorum === undefined ||
      payload.slashPercentage === undefined
    ) {
      throw createHttpError(400, 'All parameter fields are required');
    }

    const normalized = {
      baseReward: Number(payload.baseReward),
      challengeBond: Number(payload.challengeBond),
      validatorQuorum: Number(payload.validatorQuorum),
      slashPercentage: Number(payload.slashPercentage)
    };

    if (
      !Number.isFinite(normalized.baseReward) ||
      !Number.isFinite(normalized.challengeBond) ||
      !Number.isFinite(normalized.validatorQuorum) ||
      !Number.isFinite(normalized.slashPercentage)
    ) {
      throw createHttpError(400, 'Parameters must be numeric values');
    }

    const updated = await updateAdminParameters(normalized);
    res.json({
      baseReward: updated.baseReward,
      challengeBond: updated.challengeBond,
      validatorQuorum: updated.validatorQuorum,
      slashPercentage: updated.slashPercentage,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

export async function getOracleHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await fetchAdminSettings();
    res.json({
      oracleUrl: settings.oracleUrl,
      updatedAt: settings.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOracleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as { url?: string };
    if (!payload.url) {
      throw createHttpError(400, 'Oracle URL is required');
    }
    const updated = await updateAdminOracle(payload.url);
    res.json({
      oracleUrl: updated.oracleUrl,
      updatedAt: updated.updatedAt
    });
  } catch (error) {
    next(error);
  }
}

export async function registerDatasetHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = req.body as RegisterDatasetInput;
    const dataset = await registerDatasetOnChain(payload);
    res.json({ dataset });
  } catch (error) {
    next(error);
  }
}
