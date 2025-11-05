// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDAOExecutor} from "./interfaces/IDAOExecutor.sol";
import {IERC20Minimal} from "./interfaces/IERC20Minimal.sol";

/**
 * @title DAOGovernor
 * @notice Minimal Governor style contract that references an off-chain voting snapshot.
 * @dev Voting power is injected by the caller to keep this contract dry-run only. ForVotes,
 *      AgainstVotes, and AbstainVotes are accumulated from trusted signers; no token transfers.
 */
contract DAOGovernor {
    /// @notice Possible states for a proposal lifecycle.
    enum ProposalState {
        Pending,
        Active,
        Defeated,
        Succeeded,
        Executed,
        Cancelled
    }

    /// @notice Voting options.
    enum VoteType {
        Against,
        For,
        Abstain
    }

    /// @notice Stores vote metadata for a voter.
    struct Receipt {
        bool hasVoted;
        VoteType support;
        uint256 weight;
        bytes32 attestationHash;
    }

    /// @notice Container for a proposal and its execution payload.
    struct Proposal {
        uint256 id;
        address proposer;
        bytes32 snapshotHash;
        uint256 totalVotingPower; // derived off-chain, used for quorum math
        uint64 voteStart; // timestamp when proposal becomes active
        uint64 voteEnd; // timestamp when proposal ends
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        ProposalState state;
    }

    /// @notice Configuration parameters for governance.
    struct GovernanceConfig {
        uint64 votingDelay; // seconds before a proposal becomes active
        uint64 votingPeriod; // length of voting window in seconds
        uint256 quorumNumerator; // e.g. 10
        uint256 quorumDenominator; // e.g. 100
    }

    /// @notice Reference to the DAO executor timelock skeleton.
    IDAOExecutor public immutable executor;

    /// @notice Optional token to reference for future on-chain voting power integrations.
    IERC20Minimal public immutable governanceToken;

    /// @notice Configuration of voting delays, periods, and quorum ratio.
    GovernanceConfig public governanceConfig;

    /// @notice Latest proposal identifier.
    uint256 public proposalCount;

    /// @notice Mapping of proposal id to proposal data.
    mapping(uint256 => Proposal) private proposals;

    /// @notice Tracks individual voter receipts per proposal.
    mapping(uint256 => mapping(address => Receipt)) public proposalReceipts;

    /// @notice Returns the human-friendly description hash emitted on proposal creation.
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        bytes32 indexed snapshotHash,
        address[] targets,
        string description,
        uint256 votingStart,
        uint256 votingEnd
    );

    /// @notice Emitted whenever a vote is cast.
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType support,
        uint256 weight,
        bytes32 attestationHash
    );

    /// @notice Emitted when a proposal is executed.
    event ProposalExecuted(uint256 indexed proposalId);

    /// @notice Emitted when a proposal is cancelled.
    event ProposalCancelled(uint256 indexed proposalId);

    /**
     * @param executor_ Address of the timelock-style executor.
     * @param token_ Optional governance token for future integrations (can be zero address).
     * @param config Initial governance configuration parameters.
     */
    constructor(address executor_, address token_, GovernanceConfig memory config) {
        require(executor_ != address(0), "DAOGovernor: executor zero");
        require(config.votingPeriod > 0, "DAOGovernor: voting period zero");
        require(config.quorumDenominator > 0, "DAOGovernor: quorum denom zero");

        executor = IDAOExecutor(executor_);
        governanceToken = IERC20Minimal(token_);
        governanceConfig = config;
    }

    /**
     * @notice Creates a proposal bound to an off-chain voting snapshot.
     * @param snapshotHash Hash of the off-chain voting snapshot manifest.
     * @param totalVotingPower Total voting weight (from the snapshot).
     * @param targets Array of contract addresses to call.
     * @param values ETH values to forward (must be zero for dry-run safety).
     * @param signatures Function signatures for each call.
     * @param calldatas Encoded calldata for each call (excluding the signature).
     * @param description Human-readable proposal description.
     * @return proposalId Newly assigned proposal identifier.
     */
    function propose(
        bytes32 snapshotHash,
        uint256 totalVotingPower,
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256 proposalId) {
        require(snapshotHash != bytes32(0), "DAOGovernor: snapshot required");
        require(totalVotingPower > 0, "DAOGovernor: zero voting power");
        require(
            targets.length == values.length &&
                targets.length == signatures.length &&
                targets.length == calldatas.length,
            "DAOGovernor: array length mismatch"
        );
        for (uint256 i = 0; i < values.length; i++) {
            require(values[i] == 0, "DAOGovernor: only zero-value calls");
        }

        proposalId = ++proposalCount;
        uint64 start = uint64(block.timestamp + governanceConfig.votingDelay);
        uint64 end = uint64(start + governanceConfig.votingPeriod);

        proposals[proposalId] = Proposal({
            id: proposalId,
            proposer: msg.sender,
            snapshotHash: snapshotHash,
            totalVotingPower: totalVotingPower,
            voteStart: start,
            voteEnd: end,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            targets: targets,
            values: values,
            signatures: signatures,
            calldatas: calldatas,
            state: ProposalState.Pending
        });

        emit ProposalCreated(proposalId, msg.sender, snapshotHash, targets, description, start, end);
    }

    /**
     * @notice Casts a vote with weight supplied from an off-chain tally.
     * @param proposalId Identifier of the proposal being voted on.
     * @param support Vote choice (0=Against, 1=For, 2=Abstain).
     * @param weight Voting power granted to the voter (from the snapshot).
     * @param attestationHash Hash of the signed off-chain attestation proving voting rights.
     */
    function castVote(
        uint256 proposalId,
        VoteType support,
        uint256 weight,
        bytes32 attestationHash
    ) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "DAOGovernor: unknown proposal");
        _syncState(proposal);
        require(proposal.state == ProposalState.Active, "DAOGovernor: voting closed");
        require(!proposalReceipts[proposalId][msg.sender].hasVoted, "DAOGovernor: already voted");
        require(attestationHash == proposal.snapshotHash, "DAOGovernor: snapshot mismatch");
        require(weight > 0, "DAOGovernor: weight zero");

        Receipt storage receipt = proposalReceipts[proposalId][msg.sender];
        receipt.hasVoted = true;
        receipt.support = support;
        receipt.weight = weight;
        receipt.attestationHash = attestationHash;

        if (support == VoteType.For) {
            proposal.forVotes += weight;
        } else if (support == VoteType.Against) {
            proposal.againstVotes += weight;
        } else {
            proposal.abstainVotes += weight;
        }

        emit VoteCast(msg.sender, proposalId, support, weight, attestationHash);
    }

    /**
     * @notice Queues proposal actions in the executor once voting succeeds.
     * @param proposalId Identifier of the proposal to queue.
     * @param eta Execution timestamp to program in the executor.
     */
    function queue(uint256 proposalId, uint256 eta) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "DAOGovernor: unknown proposal");
        _syncState(proposal);
        require(proposal.state == ProposalState.Succeeded, "DAOGovernor: proposal not succeeded");

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            executor.queueTransaction(
                proposalId,
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                eta
            );
        }
    }

    /**
     * @notice Executes the queued actions once the executor delay has elapsed.
     * @param proposalId Identifier of the proposal to execute.
     */
    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "DAOGovernor: unknown proposal");
        require(proposal.state == ProposalState.Succeeded, "DAOGovernor: proposal not ready");

        proposal.state = ProposalState.Executed;

        for (uint256 i = 0; i < proposal.targets.length; i++) {
            executor.executeTransaction(
                proposalId,
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i]
            );
        }

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancels a proposal (e.g., if off-chain committee rescinds support).
     * @param proposalId Identifier of the proposal to cancel.
     */
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "DAOGovernor: unknown proposal");
        require(
            msg.sender == proposal.proposer,
            "DAOGovernor: only proposer can request cancel during dry-run"
        );
        require(proposal.state != ProposalState.Executed, "DAOGovernor: already executed");

        proposal.state = ProposalState.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    /**
     * @notice Returns the latest state of a proposal.
     * @param proposalId Identifier to query.
     */
    function state(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.id == 0) {
            revert("DAOGovernor: unknown proposal");
        }
        Proposal memory snapshot = proposal;
        return _calculateState(snapshot);
    }

    /**
     * @notice Retrieves full proposal data.
     * @param proposalId Identifier to query.
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id != 0, "DAOGovernor: unknown proposal");
        return proposal;
    }

    /**
     * @notice Internal helper to sync stored proposal.state based on timestamps.
     */
    function _syncState(Proposal storage proposal) internal {
        ProposalState computed = _calculateState(proposal);
        proposal.state = computed;
    }

    /**
     * @notice Computes the expected state of a proposal.
     * @dev This pure helper avoids mutating storage; use `_syncState` when updating.
     */
    function _calculateState(Proposal memory proposal) internal view returns (ProposalState) {
        if (proposal.state == ProposalState.Cancelled) {
            return ProposalState.Cancelled;
        }
        if (proposal.state == ProposalState.Executed) {
            return ProposalState.Executed;
        }

        if (block.timestamp < proposal.voteStart) {
            return ProposalState.Pending;
        }
        if (block.timestamp <= proposal.voteEnd) {
            return ProposalState.Active;
        }

        bool quorumReached = _quorumReached(proposal);
        bool voteSucceeded = proposal.forVotes > proposal.againstVotes;

        if (quorumReached && voteSucceeded) {
            return ProposalState.Succeeded;
        }

        return ProposalState.Defeated;
    }

    /**
     * @notice Quorum check derived from the stored off-chain voting power.
     * @param proposal Proposal memory snapshot.
     * @return True when the for-votes satisfy the configured quorum ratio.
     */
    function _quorumReached(Proposal memory proposal) internal view returns (bool) {
        if (proposal.totalVotingPower == 0) {
            return false;
        }

        uint256 numerator = governanceConfig.quorumNumerator;
        uint256 denominator = governanceConfig.quorumDenominator;

        return proposal.forVotes * denominator >= proposal.totalVotingPower * numerator;
    }

    /**
     * @notice TODO: Wire in role-based access control once the Steward Council is formalised.
     *         Consider EIP-712 signed ballots to strengthen vote authenticity pre-mainnet.
     */
}
