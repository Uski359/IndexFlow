# Core Usage Output Contract (v1)

Contract fields:
- protocol: "indexflow"
- output_version: "1.0"
- wallet: EIP-55 checksummed address
- campaign_id: string identifier for the campaign
- window: { type, start, end } with unix seconds (integers)
- verified_usage: boolean (AND over thresholds)
- usage_summary: { days_active, tx_count, unique_contracts }
- criteria: { criteria_set_id, engine_version: "v1", params }
- proof: { hash_algorithm: "keccak256", canonical_hash }

Canonicalization rules:
- Stable JSON key order per object:
  - root: protocol, output_version, wallet, campaign_id, window, verified_usage, usage_summary, criteria, proof
  - window: type, start, end
  - usage_summary: days_active, tx_count, unique_contracts
  - criteria: criteria_set_id, engine_version, params
  - criteria.params: min_days_active, min_tx_count, min_unique_contracts
  - proof: hash_algorithm, canonical_hash
- Arrays keep their order; numbers are integers; booleans are booleans.

Proof hash computation:
- Set proof.canonical_hash to an empty string.
- Canonicalize the output as JSON with the rules above.
- canonical_hash = keccak256(utf8Bytes(canonical_json)).
- Store canonical_hash back into proof.canonical_hash.
