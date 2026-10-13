# Campaign Configuration

Campaigns are configured in-repo and treated as first-class config objects.

- Source file: `src/config/campaigns.ts`
- Access helpers: `src/config/campaignRegistry.ts`

## Campaign model

Each campaign uses a typed `CampaignConfig`:

- `id`: stable campaign identifier (used by `campaign_id` request fields)
- `name`: display name
- `chain_id`: EVM chain ID for metrics/block resolution
- `default_window`: default relative window (`last_7_days`, `last_14_days`, `last_30_days`)
- `criteria_set_id_default`: default criteria preset ID used by the evaluator
- `criteria_sets` (optional): available criteria set metadata
- `targets`: contract allowlist (`kind: "contract"`, address + optional metadata)
- `created_at` / `notes` (optional): metadata only

Campaign configs are validated with zod at module load.

- `development` / `test`: invalid config throws immediately.
- `production`: invalid config is logged and excluded from the registry.

## How to add a campaign

1. Open `src/config/campaigns.ts`.
2. Add a new entry to `rawCampaignConfigs` with a unique `id`.
3. Set `criteria_set_id_default` to a criteria preset supported by the evaluator.
4. Add at least one `targets` entry for the contract allowlist.
5. (Optional) Add `criteria_sets`, `created_at`, and `notes`.

## How targets are used

`targets` is a contract allowlist stored per campaign. It is normalized to lowercase and made available to the metrics layer through `getCampaignTargets(id)`.

- Metrics resolution is DB-first (indexer MongoDB) with RPC fallback only when DB metrics are not available.
- Computation is scoped to the campaign `targets` allowlist.
- MVP metrics:
  - `tx_count`: matching interactions for the wallet within allowlist + window.
  - `days_active`: distinct UTC days with at least one matching interaction.
  - `unique_contracts`: currently fixed to `0` (pending).
- RPC fallback is intentionally limited to ERC20 `Transfer`-tagged targets for correctness. If targets are not ERC20-compatible, fallback is disabled and returns `rpc_fallback_not_ready`.

## default_window and criteria_set_id_default

- `default_window` is campaign metadata for UI/default orchestration.
- `criteria_set_id_default` is used by evaluator flows (`/v1/evaluate`, `/v1/campaign/run`, `/v1/campaign/insights`, `/v1/campaign/commentary`) when resolving proof criteria.
