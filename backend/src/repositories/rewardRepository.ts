import { Pool } from 'pg';

import { getPool } from '../db/postgres.js';
import { RewardEvent } from '../types/protocol.js';

interface RewardEventRow {
  id: string;
  dataset_id: string;
  recipient: string;
  amount: string | number;
  created_at: string | Date;
}

const EVENT_FIELDS = `
  id,
  dataset_id,
  recipient,
  amount,
  created_at
`;

function mapRewardEvent(row: RewardEventRow): RewardEvent {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    recipient: row.recipient,
    amount: Number(row.amount),
    createdAt: new Date(row.created_at).toISOString()
  };
}

function getClient(): Pool {
  return getPool();
}

export async function insertRewardEvent(event: RewardEvent): Promise<RewardEvent> {
  const client = getClient();
  const { rows } = await client.query<RewardEventRow>(
    `
      INSERT INTO protocol_reward_events (
        id,
        dataset_id,
        recipient,
        amount,
        created_at
      )
      VALUES ($1, $2, LOWER($3), $4, $5::timestamptz)
      RETURNING ${EVENT_FIELDS}
    `,
    [event.id, event.datasetId, event.recipient, event.amount, event.createdAt]
  );

  return mapRewardEvent(rows[0]);
}

export async function fetchRecentRewardEvents(
  address?: string,
  limit = 5
): Promise<RewardEvent[]> {
  const client = getClient();

  const query = address
    ? `
        SELECT ${EVENT_FIELDS}
        FROM protocol_reward_events
        WHERE recipient = LOWER($1)
        ORDER BY created_at DESC
        LIMIT $2
      `
    : `
        SELECT ${EVENT_FIELDS}
        FROM protocol_reward_events
        ORDER BY created_at DESC
        LIMIT $1
      `;

  const params = address ? [address, limit] : [limit];
  const { rows } = await client.query<RewardEventRow>(query, params);
  return rows.map(mapRewardEvent);
}

export async function sumRewardEvents(address?: string): Promise<number> {
  const client = getClient();
  const query = address
    ? `
        SELECT COALESCE(SUM(amount), 0) AS value
        FROM protocol_reward_events
        WHERE recipient = LOWER($1)
      `
    : `
        SELECT COALESCE(SUM(amount), 0) AS value
        FROM protocol_reward_events
      `;

  const params = address ? [address] : [];
  const { rows } = await client.query<{ value: string }>(query, params);
  return Number(rows[0]?.value ?? 0);
}
