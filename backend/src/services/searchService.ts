import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { searchDatasetsByQuery } from '../repositories/datasetRepository.js';
import { searchDatasetDocuments } from './elasticService.js';
import { Dataset } from '../types/protocol.js';

interface SearchResult<T> {
  query: string;
  sql: string;
  results: T[];
}

export async function searchDatasets<T>(query: string): Promise<SearchResult<T>> {
  const normalizedQuery = query.trim();

  const sqlForQuery =
    normalizedQuery.length > 0
      ? `SELECT * FROM protocol_datasets WHERE metadata->>'name' ILIKE '%${normalizedQuery.replace(
          /'/g,
          "''"
        )}%' LIMIT 20;`
      : 'SELECT * FROM protocol_datasets ORDER BY updated_at DESC LIMIT 20;';

  const dbResults = await searchDatasetsByQuery(normalizedQuery);
  const combined: Dataset[] = [...dbResults];

  if (normalizedQuery && config.elasticNode) {
    try {
      const elasticResults = await searchDatasetDocuments(normalizedQuery, 20);
      if (elasticResults.length > 0) {
        const byId = new Map(combined.map((dataset) => [dataset.id, dataset]));
        for (const dataset of elasticResults) {
          if (!byId.has(dataset.id)) {
            combined.push(dataset);
          }
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'ElasticSearch query failed, falling back to Postgres/local data');
    }
  }

  return {
    query: normalizedQuery,
    sql: sqlForQuery,
    results: combined as unknown as T[]
  };
}
