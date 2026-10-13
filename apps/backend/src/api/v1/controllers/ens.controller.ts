import type { Request, Response } from 'express';

import { logger } from '../../../infra/config/logger.js';
import { resolveEnsName, isValidEnsName } from '../../../services/ensService.js';
import { ensResolveQuerySchema } from '../../schema/ensSchema.js';

export const getEnsResolve = async (req: Request, res: Response) => {
  try {
    const parsed = ensResolveQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_name' });
    }

    const name = parsed.data.name.trim().toLowerCase();
    if (!isValidEnsName(name)) {
      return res.status(400).json({ error: 'invalid_name' });
    }

    const result = await resolveEnsName(name);
    return res.json(result);
  } catch (error) {
    logger.error({ err: error }, 'ENS resolve failed');
    const rawName = typeof req.query.name === 'string' ? req.query.name : '';
    return res.status(200).json({
      name: rawName.trim().toLowerCase(),
      address: null,
      normalized_address: null,
      cached: false,
      error: 'resolver_error'
    });
  }
};

