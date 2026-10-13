// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title StakingPool
/// @notice Minimal single-asset staking pool with fixed-rate reward funding.
/// @dev Uses reward-per-token accounting to keep reward distribution linear and fair.
contract StakingPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;

    uint256 public totalStaked;

    // reward accounting
    uint256 public rewardRate; // tokens per second
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public periodFinish;

    uint256 private constant PRECISION = 1e18;

    mapping(address => uint256) public balances;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardAdded(uint256 amount, uint256 duration, uint256 rewardRate);

    constructor(IERC20 token) {
        require(address(token) != address(0), "TokenZero");
        stakingToken = token;
    }

    /* -------------------------------------------------------------------------- */
    /*                             User interactions                              */
    /* -------------------------------------------------------------------------- */

    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "AmountZero");

        totalStaked += amount;
        balances[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "AmountZero");
        require(balances[msg.sender] >= amount, "InsufficientBalance");

        totalStaked -= amount;
        balances[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "NoRewards");

        rewards[msg.sender] = 0;
        stakingToken.safeTransfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    /* -------------------------------------------------------------------------- */
    /*                                View helpers                                */
    /* -------------------------------------------------------------------------- */

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }

        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + ((timeDelta * rewardRate * PRECISION) / totalStaked);
    }

    function earned(address account) public view returns (uint256) {
        return
            ((balances[account] * (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION) +
            rewards[account];
    }

    function getUserInfo(address user) external view returns (uint256 stakedAmount, uint256 pendingRewards) {
        stakedAmount = balances[user];
        pendingRewards = earned(user);
    }

    /* -------------------------------------------------------------------------- */
    /*                                Admin logic                                 */
    /* -------------------------------------------------------------------------- */

    /// @notice Owner funds rewards and sets a fixed distribution duration.
    /// @param amount Total reward tokens to stream.
    /// @param duration Seconds over which to distribute.
    function notifyRewardAmount(uint256 amount, uint256 duration) external onlyOwner updateReward(address(0)) {
        require(amount > 0, "AmountZero");
        require(duration > 0, "DurationZero");

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        if (block.timestamp >= periodFinish) {
            rewardRate = amount / duration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (amount + leftover) / duration;
        }

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;

        emit RewardAdded(amount, duration, rewardRate);
    }

    /* -------------------------------------------------------------------------- */
    /*                             Internal accounting                             */
    /* -------------------------------------------------------------------------- */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();

        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }
}
