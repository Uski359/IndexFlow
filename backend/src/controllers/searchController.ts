import { NextFunction, Request, Response } from 'express';

import { searchDatasets } from '../services/searchService.js';
import { Dataset } from '../types/protocol.js';

export async function searchHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = (req.query.q as string | undefined) ?? (req.headers['x-search-query'] as string);
    const result = await searchDatasets<Dataset>(query ?? '');
    res.json(result);
  } catch (error) {
    next(error);
  }
}
