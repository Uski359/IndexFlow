# IndexFlow Token Utility Layer

This document summarizes a simple, modular Token Utility Layer that can evolve with IndexFlow. It introduces staking, rewards, proof-of-indexing (PoI), and contribution tracking primitives that the indexer, backend API, and frontend can consume.

## Components
- **StakingPool** — custodial staking of IFLW with linear rewards from a pre-funded pool. Users: `stake`, `unstake`, `claimRewards`, `getUserInfo`.
- **ProofOfIndexing** — operators submit PoI (chain + block range + hash) to build reputation and gate rewards in later iterations.
- **ContributionRegistry** — generic “share/data-to-earn” signal. Stores weighted contributions on-chain and emits events for off-chain reward programs.

## Staking Model
- **Token**: IFLW (ERC20) at `0x93b95F6956330f4a56E7A94457A7E597a7340E61` on Sepolia (mainnet later).
- **Reward pool**: Non-inflationary. DAO/revenue funds the contract. Rewards accrue continuously using a `rewardPerToken` accumulator (Synthetix-style).
- **State tracked**:
  - `totalStaked`
  - `rewardRate` (tokens per second funded from pool)
  - `rewardPerTokenStored`, `lastUpdateTime`
  - Per user: `balance`, `userRewardPerTokenPaid`, `rewards`
- **Actions**:
  - `stake(amount)`: transfers IFLW in, updates rewards, mints stake balance.
  - `unstake(amount)`: updates rewards, returns stake.
  - `claimRewards()`: transfers accrued rewards from pool.
  - **Admin**: `notifyRewardAmount(amount, duration)` funds rewards with fixed rate; `setRewardRate` optional guard.
- **Events**: `Staked`, `Unstaked`, `RewardClaimed`.

## Proof of Indexing
- **Goal**: attest that an operator indexed a chain segment.
- **Action**: `submitProof(bytes32 chainId, uint256 fromBlock, uint256 toBlock, bytes32 proofHash)`.
- **Storage**: latest proof per operator+chain; append-only event log for history.
- **Event**: `ProofSubmitted(operator, chainId, fromBlock, toBlock, proofHash, timestamp)`.
- **Future**: plug PoI validity into rewards (only operators with fresh PoI claim boosts).

## Contribution / Share-to-Earn
- **Action**: `recordContribution(address user, string contributionType, uint256 weight)`.
- **Purpose**: emit structured events for off-chain reward campaigns (e.g., data shares, analytics, referrals). Minimal on-chain logic now; heavier logic can be layered later.
- **Event**: `ContributionRecorded(user, contributionType, weight, timestamp)`.

## Indexer Integration
- **New parsers**: `staking.ts`, `poi.ts`, `contributions.ts` decoding events via ABIs.
- **Collections**:
  - `staking_events`: `{ chain, txHash, block, user, amount, eventType, timestamp }`
  - `poi_events`: `{ chain, operator, chainId, fromBlock, toBlock, proofHash, timestamp }`
  - `contributions`: `{ chain, user, contributionType, weight, timestamp }`
- **Workers**: extend listener + backfill to subscribe/query the above topics on configured chains.

## Backend APIs
- `/api/staking`
  - `GET /user/:address` — aggregates user stakes, rewards claimed.
  - `GET /global` — total staked, stakers, rewards distributed.
- `/api/poi`
  - `GET /operator/:address` — recent proofs.
  - `GET /recent` — latest proofs across operators.
- `/api/contributions`
  - `GET /user/:address`
  - `GET /leaderboard` — weight-sorted.

All return `{ success: true, data }`.

## Frontend UX
- Dashboard cards for staking totals and recent PoI.
- User views:
  - Staking: balances, rewards claimed, latest actions.
  - PoI: operator submissions table.
  - Contributions: personal log + leaderboard.
- Chain selector applies to these views.

## Extensibility
- Reward sources can be swapped (treasury/fee router).
- PoI verification hooks can require signatures or Merkle proofs.
- Contribution weights can drive automated on-chain payouts in a future “RewardsV2”.
- Deployment registry (`contracts/deployments/<network>.json`) centralizes addresses for the indexer/API/FE.
