PolicyKit (by IndexFlow)

PolicyKit is a production-grade, programmable authorization and risk engine for autonomous on-chain AI agents built for Base Mainnet.

Rather than acting as another wallet infrastructure, session key router, or consumer smart account, PolicyKit sits on top of existing account primitives (Coinbase CDP AgentKit, ZeroDev, Rhinestone, Safe) as an economic safety and policy enforcement layer. It decodes transaction intent at runtime to prevent slippage exploits, low-liquidity token drains, and malicious execution, smoothly bridging autonomous execution with human-in-the-loop risk escalation.

PolicyKit strictly separates cryptographic verification and risk evaluation from human interpretation, ensuring that every transaction decision produces a deterministic, verifiable DecisionReceipt without compromising execution speed.

What PolicyKit Enables

PolicyKit can be used to:

Enforce granular spending caps, contract allowlists, and time-bounded execution windows for AI agents

Evaluate transaction calldata at runtime for economic risk (slippage, token reputation, liquidity thresholds)

Route transactions dynamically through multi-tier authorization workflows (Autonomous / Webhook Throttle / Human-in-the-Loop Approval)

Provide deterministic risk scoring and audit trails for Agentic DeFi, treasury management, and autonomous trading bots

Integrate seamlessly with existing Agentic Commerce flows (x402 payments, zkTLS state proofs, CDP AgentKit)

------------------------------------------------------------------------------------------------------------------------------------------------

✨ Core Capabilities

Programmable Policy Engine

Granular Execution Limits: Restrict execution by contract allowlists, allowed methods, ETH/x402 spend caps, and rolling time windows.

Calldata-Level Economic Safety: Decodes transaction calldata to enforce slippage ceilings, minimum liquidity bounds, and verified token lists before execution.

Infrastructure Agnostic: Integrates natively with Coinbase CDP Agentic Wallets, ZeroDev Kernel (ERC-7579), Rhinestone Smart Sessions, and Safe Modules.
Dynamic Risk Escalation (Human-in-the-Loop)

Low Risk: Instant, autonomous on-chain execution for routine transactions.

Medium Risk: Dynamic threshold throttling, tighter policy constraints, and real-time webhook logging.

High Risk: Automatic execution pause with instant human-in-the-loop escalation (Slack/Farcaster webhook approval triggers).

Empirically Benchmarked Sybil & Risk Scoring (IndexFlow Core)

Deterministic Evaluation: Canonical, reproducible Sybil risk scoring (0–100) per agent and reviewer address.

Idempotent Storage & Reorg Tolerance: Persistent MongoDB checkpoints with compound indexing (chainId, txHash, logIndex) and sliding reorg-overlap safety windows.

Deterministic Proof Hashes: Verification receipts keyed by cryptographically derived proof hashes (SCORE_V1).

Developer-First Integration

Public REST API (POST /api/v1/sybil/check) with Viem EVM address validation.

Strict TypeScript SDK (@policykit/sdk) for 3-line policy checks in AgentKit / LangChain pipelines.

Live interactive Playground UI for simulating x402 agent transactions, policy rules, and DecisionReceipt visual badges (ALLOW, REVIEW, DENY).
------------------------------------------------------------------------------------------------------------------------------------------------
🧠 How It Works (High Level)

Agent generates a transaction intent (target contract, calldata, value, zkTLS proof).

@policykit/sdk calls PolicyKit Risk Engine (/api/v1/sybil/check).

PolicyKit decodes calldata, queries MongoDB Atlas for Sybil clusters and reviewer history, and checks contract allowlists.

Risk Engine evaluates economic factors (slippage, token reputation, daily spend budget).

Transaction is assigned a risk score and routed:

LOW RISK (ALLOW): Proceeds to execution via CDP AgentKit or ZeroDev.

MEDIUM RISK (REVIEW): Throttled or escalated to operator webhook.

HIGH RISK (DENY): Transaction rejected on-chain; audit receipt logged.

Execution receipt is persisted idempotently to MongoDB with checkpointing.
------------------------------------------------------------------------------------------------------------------------------------------------
📊 Empirically Benchmarked AccuracyPolicyKit's underlying risk engine was benchmarked using a seeded dataset (seed: 8453) of 200 candidate addresses on Base Mainnet:MetricEmpirical Benchmark ResultSeed8453 (Base Mainnet Chain ID)Candidate Sample Size200 EVM Addresses (100 Sybils / 100 Organics)True Positives (TP)100 / 100 (100% Catch Rate / Recall)False Positives (FP)5 / 100Uncertains10Empirical Precision95.2%95% Wilson Confidence Interval89.3% – 97.9%Note: Fully reproducible locally via make reproduce.
------------------------------------------------------------------------------------------------------------------------------------------------

🚀 Quick Start & Integration

1. Install SDK

pnpm add @policykit/sdk


2. Enforce Risk Policies in 3 Lines

import { PolicyKitClient } from "@policykit/sdk";

const policyKit = new PolicyKitClient({
  apiUrl: "https://backend-production-d5a2.up.railway.app",
  network: "base-mainnet",
});

// Evaluate transaction intent before execution
const receipt = await policyKit.evaluateTransaction({
  agentAddress: "0xYourAgentAddress...",
  targetContract: "0xAerodromeRouter...",
  valueEth: "0.05",
  maxSlippagePercent: 1.0,
});

if (receipt.status === "ALLOW") {
  // Execute transaction via CDP AgentKit or ZeroDev
} else if (receipt.status === "REVIEW") {
  // Escalated to Human-in-the-Loop operator
}

------------------------------------------------------------------------------------------------------------------------------------------------

⚙️ Monorepo Architecture

policykit/
├── apps/
│   ├── backend/          # Express REST API, Viem Base Indexer & MongoDB models
│   └── playground/       # Interactive Next.js Simulator UI (@policykit/sdk)
├── packages/
│   └── policykit-sdk/    # Strict TypeScript client & evaluator library
├── scripts/
│   ├── benchmark.ts      # Reproducible 95.2% accuracy benchmark runner
│   └── fetchLiveBaseData.ts # Live Base Mainnet ERC-8004 event extractor
├── docs/
│   ├── evidence-pack.md  # Grant & BEF empirical evidence pack
│   └── methodology.md    # Labeling protocol & Wilson interval methodology
└── Makefile              # Root build & benchmark targets

------------------------------------------------------------------------------------------------------------------------------------------------
🌐 Multi-Chain & Framework Readiness

PolicyKit is architected for seamless expansion across the EVM and Agentic ecosystems:

Framework Agnostic: Native integration hooks for CDP AgentKit, LangChain, AutoGen, and Eliza.

Account Agnostic: Works with Coinbase CDP Agentic Wallets, ZeroDev Kernel, Rhinestone, and Safe.

Superchain Ready: Built on Base Mainnet (chainId: 8453) with native readiness for OP Stack / Superchain expansion (Optimism, Zora, Mode).
------------------------------------------------------------------------------------------------------------------------------------------------

🎯 Design Philosophy

PolicyKit is built around non-negotiable principles:

Economic Safety over Access Permissions (calldata validation over simple address allowlists)

Controlled Autonomy over Unrestricted Access (risk escalation over binary execution)

Infrastructure Maturity over UI Polish (idempotency, reorg tolerance, deterministic replays)

Proof First, Interpretation Second (mathematical precision and Wilson intervals over hype)
------------------------------------------------------------------------------------------------------------------------------------------------

🧪 Current Status

Live Mainnet Indexer: Active indexing of ERC-8004 Identity and Reputation Registries on Base Mainnet (0x8004BAa17C55a88189AE136b182e5fdA19dE9b63).

Verified SDK & REST API: Deployed backend and published @policykit/sdk with 59 passing tests across the monorepo.

Interactive Playground: Live Next.js simulator deployed for real-time policy evaluation and decision receipt generation.

Base Ecosystem Fund (BEF) & RFB #1 Alignment: Fully aligned with Base Request for Builders #1 (Priority #6 Agentic Commerce & Priority #3 Onchain Credit/Risk).
------------------------------------------------------------------------------------------------------------------------------------------------

📌 One-Line Summary

PolicyKit is a programmable authorization and economic risk engine for autonomous AI agents on Base — enforcing calldata safety, dynamic risk escalation, and empirically proven Sybil filtering (95.2% Precision) without replacing existing smart account infrastructure.
------------------------------------------------------------------------------------------------------------------------------------------------

 Repositories & Demo

Monorepo: https://github.com/Uski359/policykit

Interactive Playground Demo: https://www.policykit.network/demo

API Health: GET https://backend-production-d5a2.up.railway.app/health

⚡ Verification & Reproducibility

To run the deterministic accuracy benchmark locally:

make reproduce

To run the full workspace test suite (59 passing tests):

pnpm run typecheck
pnpm run test

📜 License

MIT License. Built for the Base Ecosystem & Agentic Economy.
