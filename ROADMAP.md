🧭 IndexFlow Roadmap

Mission:
Build a deterministic, verifiable on-chain usage index with optional AI interpretation — separating proof from opinion.

Phase 0 — Foundation (Completed ✅)

Status: DONE

Deterministic core usage evaluation engine

Canonical proof hashing (wallet + window + criteria)

Criteria engine (extensible, core-safe)

Mock metrics pipeline for demo & grants

Cache-first architecture (core + insights)

Demo-ready backend endpoints (/v1)

Outcome:
A reproducible, verifiable base layer suitable for grants, audits, and early partners.

Phase 1 — Insights Layer (Completed ✅)

Status: DONE

Deterministic Insights v1

Activity score (0–100)

Farming probability (%)

Behavioral tagging (organic / suspected_farm / inactive / mixed)

Cache keyed by core proof hash

Campaign-level aggregation & summaries

Insights exposed via /v1/campaign/insights

Outcome:
Human-readable interpretation without affecting proof integrity.

Phase 2 — AI Commentary (Completed ✅)

Status: DONE (Demo-ready)

Optional AI commentary layer (non-proof)

Provider abstraction (disabled / OpenAI-ready)

Commentary cached by core proof hash

Safe deterministic fallback (template-based)

Clear separation: Proof ≠ Opinion

Exposed via /v1/campaign/commentary

Outcome:
Investor- and partner-friendly explanations while preserving deterministic guarantees.

Phase 3 — Demo Dashboard (Completed ✅)

Status: DONE

Web demo dashboard

Campaign-based exploration

Score & farming risk visualization

Presets:

Top Quality wallets

Suspected Farming

Inactive wallets

Wallet-level drilldown with:

Proof hash

Insights

AI commentary

Explicit data-source badge (run / insights / commentary)

Outcome:
A 60-second demo that clearly communicates value.

Phase 4 — Seed Readiness (Current 🔄)

Status: IN PROGRESS

Repo separation & cleanup (umbrella + frontend + backend)

Documentation consolidation

Demo freeze & version tagging

Event demos & investor meetings

Early partner conversations (protocols / airdrops / grants)

Goal:
Raise seed or secure strategic grants using a clear, working product.

Phase 5 — Production Indexing (Next ⏭️)

Status: PLANNED

Replace mock metrics with live on-chain indexing

Multi-chain support (EVM first)

Historical backfill support

Deterministic replays

Criteria presets per campaign type

Rate-limited public API access

Goal:
Transition from demo to real usage data.

Phase 6 — Ecosystem & Tokenization (Future 🔮)

Status: PLANNED

Usage-based incentives

Verifier / indexer roles

Staking & slashing mechanics

DAO governance modules

Proof-of-Usage integrations

Goal:
Create a sustainable, decentralized usage verification network.

Design Principles (Non-Negotiable)

Determinism first

Proof and interpretation are separate

Cache everything

Core never breaks

Human-readable without sacrificing verifiability

Current Status

🟢 Demo-ready

🟢 Seed-ready

🟢 Event-ready
