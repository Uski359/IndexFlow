// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title IFLWStakingRewards
/// @notice Minimal staking contract for IFLOWT (staking token) paying rewards in IFLWR.
/// @dev Based on Synthetix-style reward distribution with linear accrual over a reward duration.
contract IFLWStakingRewards {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken;
    IERC20 public immutable rewardsToken;
    address public immutable owner;

    uint256 public rewardRate;
    uint256 public rewardsDuration;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    uint256 public periodFinish;

    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balances;

    uint256 public totalSupply;

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event RewardsDurationUpdated(uint256 newDuration);

    modifier onlyOwner() {
        require(msg.sender == owner, "IFLWStakingRewards: not owner");
        _;
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(address stakingToken_, address rewardsToken_, uint256 rewardsDuration_) {
        require(stakingToken_ != address(0), "staking token zero");
        require(rewardsToken_ != address(0), "rewards token zero");
        stakingToken = IERC20(stakingToken_);
        rewardsToken = IERC20(rewardsToken_);
        owner = msg.sender;
        rewardsDuration = rewardsDuration_;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) {
            return rewardPerTokenStored;
        }
        uint256 timeDelta = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + ((timeDelta * rewardRate * 1e18) / totalSupply);
    }

    function earned(address account) public view returns (uint256) {
        uint256 userBalance = balances[account];
        uint256 accrued = (userBalance * (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18;
        return rewards[account] + accrued;
    }

    function stake(uint256 amount) external updateReward(msg.sender) {
        require(amount > 0, "stake zero");
        totalSupply += amount;
        balances[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function withdraw(uint256 amount) public updateReward(msg.sender) {
        require(amount > 0, "withdraw zero");
        totalSupply -= amount;
        balances[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward() public updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward == 0) {
            return;
        }
        rewards[msg.sender] = 0;
        rewardsToken.safeTransfer(msg.sender, reward);
        emit RewardPaid(msg.sender, reward);
    }

    function exit() external {
        uint256 balance = balances[msg.sender];
        if (balance > 0) {
            withdraw(balance);
        }
        getReward();
    }

    function notifyRewardAmount(uint256 reward)
        external
        onlyOwner
        updateReward(address(0))
    {
        require(reward > 0, "reward zero");
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }
        rewardsToken.safeTransferFrom(msg.sender, address(this), reward);
        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    function setRewardsDuration(uint256 duration) external onlyOwner {
        require(block.timestamp > periodFinish, "period not finished");
        require(duration > 0, "duration zero");
        rewardsDuration = duration;
        emit RewardsDurationUpdated(duration);
    }
}
