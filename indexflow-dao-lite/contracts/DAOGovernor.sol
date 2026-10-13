// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./DAOExecutor.sol";

/// @title DAOGovernor
/// @notice Lightweight governance contract that relies on an off-chain Snapshot-style vote tally
///         and a DAOExecutor timelock for execution. This contract is intentionally simplified for
///         testnet usage and should be reviewed before any mainnet deployment.
contract DAOGovernor {
    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Queued,
        Executed,
        Canceled
    }

    struct Proposal {
        address proposer;
        address target;
        uint256 value;
        string signature;
        bytes callData;
        uint48 startTime;
        uint48 endTime;
        string description;
        string snapshotURI;
        bytes32 snapshotRoot;
        uint128 forVotes;
        uint128 againstVotes;
        ProposalState state;
        bytes32 executorTxHash;
    }

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, address indexed target, string snapshotURI);
    event SnapshotResultSubmitted(uint256 indexed proposalId, uint128 forVotes, uint128 againstVotes, string proofURI);
    event ProposalQueued(uint256 indexed proposalId, bytes32 txHash, uint256 eta);
    event ProposalExecuted(uint256 indexed proposalId, bytes32 txHash);
    event ProposalCanceled(uint256 indexed proposalId, string reason);
    event RoleUpdated(string role, address indexed account);

    DAOExecutor public executor;
    address public admin;
    address public proposerRole;
    address public validator;
    uint48 public constant MIN_VOTING_PERIOD = 5 minutes;
    uint48 public constant MAX_VOTING_PERIOD = 14 days;
    uint48 public votingPeriod = 2 days;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Governor: admin only");
        _;
    }

    modifier onlyProposerRole() {
        require(msg.sender == proposerRole, "Governor: proposer only");
        _;
    }

    modifier onlyValidator() {
        require(msg.sender == validator, "Governor: validator only");
        _;
    }

    constructor(
        address admin_,
        address proposer_,
        address validator_,
        DAOExecutor executor_
    ) {
        require(address(executor_) != address(0), "Governor: executor zero");
        require(admin_ != address(0), "Governor: admin zero");
        require(proposer_ != address(0), "Governor: proposer zero");
        require(validator_ != address(0), "Governor: validator zero");
        admin = admin_;
        proposerRole = proposer_;
        validator = validator_;
        executor = executor_;
    }

    function createProposal(
        address target,
        uint256 value,
        string calldata signature,
        bytes calldata callData,
        string calldata description,
        string calldata snapshotURI,
        bytes32 snapshotRoot
    ) external onlyProposerRole returns (uint256) {
        require(target != address(0), "Governor: target zero");
        uint256 proposalId = ++proposalCount;
        uint48 start = uint48(block.timestamp);
        uint48 end = uint48(block.timestamp + votingPeriod);

        Proposal storage proposal = proposals[proposalId];
        proposal.proposer = msg.sender;
        proposal.target = target;
        proposal.value = value;
        proposal.signature = signature;
        proposal.callData = callData;
        proposal.startTime = start;
        proposal.endTime = end;
        proposal.description = description;
        proposal.snapshotURI = snapshotURI;
        proposal.snapshotRoot = snapshotRoot;
        proposal.forVotes = 0;
        proposal.againstVotes = 0;
        proposal.state = ProposalState.Active;
        proposal.executorTxHash = bytes32(0);

        emit ProposalCreated(proposalId, msg.sender, target, snapshotURI);
        return proposalId;
    }

    function submitSnapshotResult(
        uint256 proposalId,
        uint128 forVotes,
        uint128 againstVotes,
        string calldata proofURI
    ) external onlyValidator {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Governor: not active");
        require(block.timestamp >= proposal.endTime, "Governor: voting ongoing");

        proposal.forVotes = forVotes;
        proposal.againstVotes = againstVotes;
        proposal.state = forVotes > againstVotes ? ProposalState.Succeeded : ProposalState.Defeated;
        emit SnapshotResultSubmitted(proposalId, forVotes, againstVotes, proofURI);
    }

    function queueProposal(uint256 proposalId, uint256 eta) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Succeeded, "Governor: not succeeded");
        require(msg.sender == proposerRole || msg.sender == admin, "Governor: proposer or admin only");

        bytes32 txHash = executor.queueTransaction(
            proposal.target,
            proposal.value,
            proposal.signature,
            proposal.callData,
            eta
        );
        proposal.state = ProposalState.Queued;
        proposal.executorTxHash = txHash;
        emit ProposalQueued(proposalId, txHash, eta);
    }

    function executeProposal(
        uint256 proposalId,
        uint256 eta
    ) external returns (bytes memory) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Queued, "Governor: not queued");
        require(msg.sender == validator || msg.sender == admin, "Governor: validator only");

        bytes memory result = executor.executeTransaction(
            proposal.target,
            proposal.value,
            proposal.signature,
            proposal.callData,
            eta
        );
        proposal.state = ProposalState.Executed;
        emit ProposalExecuted(proposalId, proposal.executorTxHash);
        return result;
    }

    function cancelProposal(uint256 proposalId, string calldata reason) external onlyAdmin {
        Proposal storage proposal = proposals[proposalId];
        require(
            proposal.state == ProposalState.Active || proposal.state == ProposalState.Succeeded,
            "Governor: cannot cancel"
        );
        proposal.state = ProposalState.Canceled;
        emit ProposalCanceled(proposalId, reason);
    }

    function setVotingPeriod(uint48 newPeriod) external onlyAdmin {
        require(newPeriod >= MIN_VOTING_PERIOD && newPeriod <= MAX_VOTING_PERIOD, "Governor: invalid period");
        votingPeriod = newPeriod;
    }

    function updateProposer(address newProposer) external onlyAdmin {
        require(newProposer != address(0), "Governor: proposer zero");
        proposerRole = newProposer;
        emit RoleUpdated("PROPOSER", newProposer);
    }

    function updateValidator(address newValidator) external onlyAdmin {
        require(newValidator != address(0), "Governor: validator zero");
        validator = newValidator;
        emit RoleUpdated("VALIDATOR", newValidator);
    }

    function updateExecutor(DAOExecutor newExecutor) external onlyAdmin {
        require(address(newExecutor) != address(0), "Governor: executor zero");
        executor = newExecutor;
        emit RoleUpdated("EXECUTOR", address(newExecutor));
    }

    function state(uint256 proposalId) external view returns (ProposalState) {
        return proposals[proposalId].state;
    }
}

