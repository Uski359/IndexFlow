#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf "\n\033[1;36m>>> %s\033[0m\n" "$1"
}

log "Hardhat compile (local validation)"
pnpm hardhat compile

log "Unit tests (math, staking, wrapper)"
pnpm test

log "Environment sanity check"
pnpm ts-node scripts/00_print_env.ts || {
  echo "[demo] .env is missing a value. Fix the error above and rerun."
  exit 1
}

cat <<'EOF'

Next manual steps (Sepolia demo):
  1. Create pool      -> pnpm ts-node scripts/02_create_pool.ts
  2. Initialize price -> pnpm ts-node scripts/03_initialize_pool.ts
  3. Add liquidity    -> pnpm ts-node scripts/04_add_liquidity.ts
  4. Swap / fees      -> pnpm ts-node scripts/05-08 (see README)
  5. Wrapper / stake  -> scripts/09-14 if you want to extend the story

Reference: docs/Investor_Demo_Checklist.md for talking points + screenshots.
EOF
