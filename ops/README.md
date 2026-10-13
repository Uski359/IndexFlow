# IndexFlow DevOps Toolkit

This directory packages a batteries-included development environment so you can run
PostgreSQL, ElasticSearch, the FastAPI validator, backend API, and frontend app with a
single command.

## Prerequisites

- Docker Engine 24+
- Docker Compose v2
- Node.js 18+ locally (only required if you want to run commands outside of Docker)

## Quick Start

1. Copy the example env file and adjust values if needed (set `VALIDATOR_API_KEY` to any shared secret you like):

   ```bash
   cp ops/.env.example ops/.env
   ```

2. Ensure the backend and frontend env files contain production-safe secrets and the RPC /
   contract addresses you want to use.

3. Boot the stack:

   ```bash
   docker compose --env-file ops/.env -f ops/docker-compose.yml up --build
   ```

   - PostgreSQL: `localhost:$POSTGRES_PORT`
   - ElasticSearch: `http://localhost:$ELASTIC_PORT`
   - Data validator: `http://localhost:$VALIDATOR_PORT`
   - Backend API: `http://localhost:$BACKEND_PORT`
   - Frontend: `http://localhost:$FRONTEND_PORT`

Services are attached to a single Docker network so inter-service communication uses the
container names (`postgres`, `elastic`, `validator`, `backend`, `frontend`).

## Logs & Monitoring

- Backend uses Pino structured logs; by default they stream to stdout. Feed the container
  output into your logging stack (e.g., `docker logs indexflow_backend` or Docker logging
  drivers).
- Audit events are emitted with `{ "name": "audit", "event": ... }` – configure log routing
  to retain these for compliance.
- ElasticSearch is booted with security disabled. For production, provide your own
  secured cluster and set `ELASTIC_NODE` / `ELASTIC_API_KEY` in `backend/.env`.

## Database Migrations

With the stack running:

```bash
docker compose -f ops/docker-compose.yml exec backend npm run migrate
```

Or run the SQL files manually against `postgres`.

## Tear Down

```bash
docker compose -f ops/docker-compose.yml down -v
```

This removes containers and volumes (`postgres_data`, `elastic_data`).

## Production Notes

- Replace the built-in Postgres/Elastic containers with managed services as you move to
  staging/production.
- Add TLS termination, secrets management, and metrics exporters as appropriate.
- The FastAPI validator uses an in-memory queue. Back it with Redis or another durable
  store before running multiple replicas.
