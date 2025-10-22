## Database Schema & Migrations

This backend expects a PostgreSQL database with the following tables. The schema matches the pg-mem setup used in Vitest integration tests.

### Schema Overview

- `protocol_datasets` – dataset submissions and their lifecycle status.
- `protocol_verifications` – validator verification audit trail.
- `protocol_stakes` – active staking positions and rewards accrual.
- `protocol_challenges` – record of dataset challenges with bonds.
- `protocol_reward_events` – on-chain reward disbursement history.
- `protocol_settings` – DAO-governed parameters and oracle endpoint.

### SQL Migration

Apply the migrations sequentially to reconcile production databases with tests:

```bash
psql "$DATABASE_URL" -f migrations/0001_init_schema.sql
psql "$DATABASE_URL" -f migrations/0002_admin_settings.sql
```

You can also run migrations programmatically with a tool like `node-postgres` or integrate with your preferred migration runner.

### Future ORM Integration

If you move to Prisma/Drizzle, map these tables accordingly (e.g., Prisma `schema.prisma`). For now, the repositories operate on raw SQL queries expecting the schema above.
