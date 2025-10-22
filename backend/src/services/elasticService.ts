import { Client } from '@elastic/elasticsearch';

import { config } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Dataset } from '../types/protocol.js';

const DATASET_INDEX = 'indexflow-datasets';

let client: Client | null = null;
let indexEnsured = false;

function getClient(): Client | null {
  if (!config.elasticNode) {
    return null;
  }

  if (config.nodeEnv === 'test') {
    return null;
  }

  if (!client) {
    client = new Client({
      node: config.elasticNode,
      ...(config.elasticApiKey ? { auth: { apiKey: config.elasticApiKey } } : {})
    });
  }

  return client;
}

async function ensureIndex(): Promise<Client | null> {
  const es = getClient();
  if (!es) {
    return null;
  }

  if (indexEnsured) {
    return es;
  }

  try {
    const exists = await es.indices.exists({ index: DATASET_INDEX });
    if (!exists) {
      await es.indices.create({
        index: DATASET_INDEX,
        settings: {
          number_of_shards: 1,
          number_of_replicas: config.nodeEnv === 'production' ? 1 : 0
        },
        mappings: {
          properties: {
            id: { type: 'keyword' },
            hash: { type: 'keyword' },
            sqlHash: { type: 'keyword' },
            status: { type: 'keyword' },
            reward: { type: 'float' },
            qualityScore: { type: 'float' },
            reputationMultiplier: { type: 'float' },
            stakeBoost: { type: 'float' },
            updatedAt: { type: 'date' },
            submitter: { type: 'keyword' },
            metadata: {
              properties: {
                name: { type: 'text' },
                description: { type: 'text' },
                datasetType: { type: 'keyword' },
                source: { type: 'text' },
                sizeInMb: { type: 'float' },
                tags: { type: 'keyword' }
              }
            }
          }
        }
      });
    }

    indexEnsured = true;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to ensure ElasticSearch dataset index');
    return null;
  }

  return es;
}

export async function indexDatasetDocument(dataset: Dataset): Promise<void> {
  const es = await ensureIndex();
  if (!es) {
    return;
  }

  try {
    await es.index({
      index: DATASET_INDEX,
      id: dataset.id,
      document: dataset
    });

    if (config.nodeEnv !== 'production') {
      await es.indices.refresh({ index: DATASET_INDEX });
    }
  } catch (error) {
    logger.warn({ err: error, datasetId: dataset.id }, 'Failed to index dataset in ElasticSearch');
  }
}

export async function removeDatasetDocument(datasetId: string): Promise<void> {
  const es = await ensureIndex();
  if (!es) {
    return;
  }

  try {
    await es.delete({
      index: DATASET_INDEX,
      id: datasetId
    });
  } catch (error) {
    const notFound =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      (error as { statusCode: number }).statusCode === 404;

    if (!notFound) {
      logger.warn({ err: error, datasetId }, 'Failed to delete dataset from ElasticSearch');
    }
  }
}

export async function searchDatasetDocuments(
  query: string,
  limit = 20
): Promise<Dataset[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const es = await ensureIndex();
  if (!es) {
    return [];
  }

  try {
    const response = await es.search<Dataset>({
      index: DATASET_INDEX,
      size: limit,
      query: {
        multi_match: {
          query: trimmed,
          fields: [
            'metadata.name^3',
            'metadata.description',
            'metadata.tags',
            'hash',
            'sqlHash',
            'submitter'
          ]
        }
      }
    });

    return (response.hits.hits ?? [])
      .map((hit) => hit._source)
      .filter((source): source is Dataset => Boolean(source));
  } catch (error) {
    logger.warn({ err: error, query: trimmed }, 'ElasticSearch query failed');
    return [];
  }
}
