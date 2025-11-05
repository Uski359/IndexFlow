// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IndexFlowStaking
/// @notice Single-sided staking contract backing IndexFlow indexers and delegators.
contract IndexFlowStaking is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant REWARD_DISTRIBUTOR_ROLE = keccak256("REWARD_DISTRIBUTOR_ROLE");

    uint256 private constant REWARD_PRECISION = 1e18;

    IERC20 public immutable stakingToken;
    uint256 public totalStaked;
    uint256 public minimumStake;
    uint256 public lockPeriod;

    uint256 public rewardPerTokenStored;
    uint256 public pendingRewards;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public lastStakeTimestamp;

    event Staked(address indexed account, uint256 amount, uint256 newBalance);
    event Unstaked(address indexed account, uint256 amount, uint256 remainingBalance);
    event Claimed(address indexed account, uint256 amount);
    event RewardQueued(bytes32 indexed batchId, uint256 amount);
    event RewardDistributed(bytes32 indexed batchId, uint256 amount, uint256 rewardPerToken);

    constructor(
        IERC20 token,
        address admin,
        uint256 initialMinimumStake,
        uint256 initialLockPeriod
    ) {
        require(address(token) != address(0), "TokenZero");
        require(admin != address(0), "AdminZero");

        stakingToken = token;
        minimumStake = initialMinimumStake;
        lockPeriod = initialLockPeriod;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setMinimumStake(uint256 newMinimumStake) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minimumStake = newMinimumStake;
    }

    function setLockPeriod(uint256 newLockPeriod) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lockPeriod = newLockPeriod;
    }

    function grantRewardDistributor(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(REWARD_DISTRIBUTOR_ROLE, distributor);
    }

    function revokeRewardDistributor(address distributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(REWARD_DISTRIBUTOR_ROLE, distributor);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function stake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "AmountZero");

        _updateReward(_msgSender());

        balances[_msgSender()] += amount;
        totalStaked += amount;
        stakingToken.safeTransferFrom(_msgSender(), address(this), amount);

        if (minimumStake > 0) {
            require(balances[_msgSender()] >= minimumStake, "BelowMinimum");
        }
        lastStakeTimestamp[_msgSender()] = block.timestamp;

        emit Staked(_msgSender(), amount, balances[_msgSender()]);
    }

    function unstake(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "AmountZero");
        require(balances[_msgSender()] >= amount, "InsufficientBalance");

        if (lockPeriod > 0) {
            require(block.timestamp >= lastStakeTimestamp[_msgSender()] + lockPeriod, "StakeLocked");
        }

        _updateReward(_msgSender());

        balances[_msgSender()] -= amount;
        totalStaked -= amount;

        stakingToken.safeTransfer(_msgSender(), amount);
        emit Unstaked(_msgSender(), amount, balances[_msgSender()]);
    }

    function claimRewards() external whenNotPaused nonReentrant {
        _updateReward(_msgSender());
        uint256 reward = rewards[_msgSender()];
        require(reward > 0, "NothingToClaim");
        rewards[_msgSender()] = 0;
        stakingToken.safeTransfer(_msgSender(), reward);
        emit Claimed(_msgSender(), reward);
    }

    function notifyReward(uint256 amount, bytes32 batchId) external whenNotPaused nonReentrant onlyRole(REWARD_DISTRIBUTOR_ROLE) {
        require(amount > 0, "AmountZero");
        stakingToken.safeTransferFrom(_msgSender(), address(this), amount);

        uint256 distributable = amount;
        if (pendingRewards > 0) {
            distributable += pendingRewards;
            pendingRewards = 0;
        }

        if (totalStaked == 0) {
            pendingRewards = distributable;
            emit RewardQueued(batchId, distributable);
            return;
        }

        rewardPerTokenStored += (distributable * REWARD_PRECISION) / totalStaked;
        emit RewardDistributed(batchId, distributable, rewardPerTokenStored);
    }

    function earned(address account) public view returns (uint256) {
        uint256 computedRewardPerToken = rewardPerTokenStored;
        if (totalStaked > 0 && pendingRewards > 0) {
            computedRewardPerToken += (pendingRewards * REWARD_PRECISION) / totalStaked;
        }
        return
            ((balances[account] * (computedRewardPerToken - userRewardPerTokenPaid[account])) / REWARD_PRECISION) +
            rewards[account];
    }

    function _updateReward(address account) internal {
        if (totalStaked > 0 && pendingRewards > 0) {
            rewardPerTokenStored += (pendingRewards * REWARD_PRECISION) / totalStaked;
            pendingRewards = 0;
        }

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
    }
}
