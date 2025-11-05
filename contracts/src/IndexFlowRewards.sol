// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIndexFlowStaking} from "./interfaces/IIndexFlowStaking.sol";

/// @title IndexFlowRewards
/// @notice Handles Proof of Indexing submissions and reward routing between indexers and delegators.
contract IndexFlowRewards is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant COORDINATOR_ROLE = keccak256("COORDINATOR_ROLE");

    uint16 public constant BASIS_POINTS = 10_000;

    struct SubmitProofParams {
        bytes32 batchId;
        address indexer;
        bytes32 poiMerkleRoot;
        bytes32 sqlProofRoot;
        uint256 safeBlockNumber;
        uint256 rewardAmount;
    }

    struct ProofRecord {
        address indexer;
        uint256 rewardAmount;
        uint256 timestamp;
    }

    IERC20 public immutable rewardToken;
    IIndexFlowStaking public staking;

    uint16 public indexerShareBps;
    uint256 public minimumIndexerStake;
    uint256 public confirmationDepth;

    mapping(bytes32 => ProofRecord) public proofs;

    event RewardPoolFunded(address indexed funder, uint256 amount);
    event ProofSubmitted(
        bytes32 indexed batchId,
        address indexed indexer,
        uint256 safeBlockNumber,
        uint256 rewardAmount,
        bytes32 poiMerkleRoot,
        bytes32 sqlProofRoot
    );
    event Indexed(
        bytes32 indexed batchId,
        address indexed indexer,
        uint256 indexerReward,
        uint256 delegatorReward
    );
    event ParametersUpdated(uint16 indexerShareBps, uint256 minimumIndexerStake, uint256 confirmationDepth);
    event StakingContractUpdated(address indexed newStaking);

    constructor(
        IERC20 _rewardToken,
        IIndexFlowStaking _staking,
        address admin,
        uint16 initialIndexerShareBps,
        uint256 initialMinimumIndexerStake,
        uint256 initialConfirmationDepth
    ) {
        require(address(_rewardToken) != address(0), "TokenZero");
        require(address(_staking) != address(0), "StakingZero");
        require(admin != address(0), "AdminZero");
        require(initialIndexerShareBps <= BASIS_POINTS, "ShareTooHigh");

        rewardToken = _rewardToken;
        staking = _staking;
        indexerShareBps = initialIndexerShareBps;
        minimumIndexerStake = initialMinimumIndexerStake;
        confirmationDepth = initialConfirmationDepth;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setParameters(
        uint16 newIndexerShareBps,
        uint256 newMinimumIndexerStake,
        uint256 newConfirmationDepth
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newIndexerShareBps <= BASIS_POINTS, "ShareTooHigh");
        indexerShareBps = newIndexerShareBps;
        minimumIndexerStake = newMinimumIndexerStake;
        confirmationDepth = newConfirmationDepth;
        emit ParametersUpdated(newIndexerShareBps, newMinimumIndexerStake, newConfirmationDepth);
    }

    function setStaking(IIndexFlowStaking newStaking) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(address(newStaking) != address(0), "StakingZero");
        staking = newStaking;
        emit StakingContractUpdated(address(newStaking));
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function fundRewardPool(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "AmountZero");
        rewardToken.safeTransferFrom(_msgSender(), address(this), amount);
        emit RewardPoolFunded(_msgSender(), amount);
    }

    function submitProof(SubmitProofParams calldata params)
        external
        whenNotPaused
        nonReentrant
        onlyRole(COORDINATOR_ROLE)
    {
        require(params.batchId != bytes32(0), "BatchZero");
        require(proofs[params.batchId].timestamp == 0, "BatchExists");
        require(params.rewardAmount > 0, "NoReward");
        require(params.indexer != address(0), "IndexerZero");

        require(
            block.number >= params.safeBlockNumber + confirmationDepth,
            "InsufficientConfirmations"
        );

        require(
            staking.balances(params.indexer) >= minimumIndexerStake,
            "IndexerStakeTooLow"
        );

        require(
            rewardToken.balanceOf(address(this)) >= params.rewardAmount,
            "InsufficientRewards"
        );

        proofs[params.batchId] = ProofRecord({
            indexer: params.indexer,
            rewardAmount: params.rewardAmount,
            timestamp: block.timestamp
        });

        uint256 indexerShare = (params.rewardAmount * indexerShareBps) / BASIS_POINTS;
        uint256 delegatorShare = params.rewardAmount - indexerShare;

        rewardToken.safeTransfer(params.indexer, indexerShare);

        if (delegatorShare > 0) {
            rewardToken.safeIncreaseAllowance(address(staking), delegatorShare);
            staking.notifyReward(delegatorShare, params.batchId);
        }

        emit ProofSubmitted(
            params.batchId,
            params.indexer,
            params.safeBlockNumber,
            params.rewardAmount,
            params.poiMerkleRoot,
            params.sqlProofRoot
        );
        emit Indexed(params.batchId, params.indexer, indexerShare, delegatorShare);
    }
}
