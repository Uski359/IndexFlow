import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

const rootDir = process.cwd();
const backendDir = join(rootDir, 'backend');

dotenv.config({ path: join(backendDir, '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Add it to backend/.env before running migrations.');
  process.exit(1);
}

const migrations = ['0001_init_schema.sql', '0002_admin_settings.sql', '0003_dataset_validation.sql'];

async function run() {
  const pool = new Pool({
    connectionString
  });

  try {
    for (const file of migrations) {
      const sqlPath = join(backendDir, 'migrations', file);
      const sql = readFileSync(sqlPath, 'utf8');
      console.log(`Running migration ${file}...`);
      await pool.query(sql);
    }
    console.log('Migrations complete.');
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
