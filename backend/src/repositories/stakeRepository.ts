import { Pool } from 'pg';

import { getPool } from '../db/postgres.js';
import { StakePosition } from '../types/protocol.js';

interface StakeRow {
  id: string;
  address: string;
  amount: string | number;
  type: 'passive' | 'active';
  apy: string | number;
  lock_until: string | Date;
  rewards_to_claim: string | number;
}

const STAKE_FIELDS = `
  id,
  address,
  amount,
  type,
  apy,
  lock_until,
  rewards_to_claim
`;

function mapStake(row: StakeRow): StakePosition {
  return {
    id: row.id,
    address: row.address,
    amount: Number(row.amount),
    type: row.type,
    apy: Number(row.apy),
    lockUntil: new Date(row.lock_until).toISOString(),
    rewardsToClaim: Number(row.rewards_to_claim)
  };
}

function getClient(): Pool {
  return getPool();
}

export async function insertStake(position: StakePosition): Promise<StakePosition> {
  const client = getClient();
  const { rows } = await client.query<StakeRow>(
    `
      INSERT INTO protocol_stakes (
        id,
        address,
        amount,
        type,
        apy,
        lock_until,
        rewards_to_claim
      )
      VALUES ($1, LOWER($2), $3, $4, $5, $6::timestamptz, $7)
      RETURNING ${STAKE_FIELDS}
    `,
    [
      position.id,
      position.address,
      position.amount,
      position.type,
      position.apy,
      position.lockUntil,
      position.rewardsToClaim
    ]
  );

  return mapStake(rows[0]);
}

export async function deleteStake(stakeId: string): Promise<StakePosition | null> {
  const client = getClient();
  const { rows } = await client.query<StakeRow>(
    `
      DELETE FROM protocol_stakes
      WHERE id = $1
      RETURNING ${STAKE_FIELDS}
    `,
    [stakeId]
  );

  if (rows.length === 0) {
    return null;
  }

  return mapStake(rows[0]);
}

export async function fetchStakes(address?: string): Promise<StakePosition[]> {
  const client = getClient();

  if (address) {
    const { rows } = await client.query<StakeRow>(
      `
        SELECT ${STAKE_FIELDS}
        FROM protocol_stakes
        WHERE address = LOWER($1)
        ORDER BY lock_until ASC
      `,
      [address]
    );
    return rows.map(mapStake);
  }

  const { rows } = await client.query<StakeRow>(
    `SELECT ${STAKE_FIELDS} FROM protocol_stakes ORDER BY lock_until ASC`
  );
  return rows.map(mapStake);
}

export async function sumRewards(address?: string): Promise<number> {
  const client = getClient();
  const query = address
    ? `SELECT COALESCE(SUM(rewards_to_claim), 0) AS value FROM protocol_stakes WHERE address = LOWER($1)`
    : 'SELECT COALESCE(SUM(rewards_to_claim), 0) AS value FROM protocol_stakes';

  const params = address ? [address] : [];
  const { rows } = await client.query<{ value: string }>(query, params);
  return Number(rows[0]?.value ?? 0);
}

export async function clearRewardsForAddress(address: string): Promise<void> {
  const client = getClient();
  await client.query(
    `
      UPDATE protocol_stakes
      SET rewards_to_claim = 0
      WHERE address = LOWER($1)
    `,
    [address]
  );
}
