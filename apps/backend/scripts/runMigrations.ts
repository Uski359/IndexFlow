import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

import { config } from '../src/config/env.js';

const migrations = [
  '0001_init_schema.sql',
  '0002_admin_settings.sql',
  '0003_dataset_validation.sql'
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendDir = join(__dirname, '..');
const migrationsDir = join(backendDir, 'migrations');

async function main() {
  const pool = new Pool({
    connectionString: config.postgresUrl
  });

  for (const file of migrations) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    console.log(`Running ${file}...`);
    await pool.query(sql);
  }

  await pool.end();
  console.log('Migrations complete.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
