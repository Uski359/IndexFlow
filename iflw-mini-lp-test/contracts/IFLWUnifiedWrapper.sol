// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IIFLWStakingRewards {
    function stake(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function getReward() external;
    function balances(address account) external view returns (uint256);
}

/// @title IFLWUnifiedWrapper
/// @notice Presents a single ERC20 share to users while staking IFLOWT and accruing IFLWR rewards internally.
contract IFLWUnifiedWrapper is ERC20, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant PRECISION = 1e18;

    IERC20 public immutable stakingToken; // IFLOWT
    IERC20 public immutable rewardToken;  // IFLWR
    IIFLWStakingRewards public immutable stakingRewards;
    address public immutable owner;

    uint256 public rewardPerTokenStored;
    uint256 public undistributedRewards;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event RewardClaimed(address indexed account, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "UnifiedWrapper: not owner");
        _;
    }

    modifier updateRewards(address account) {
        _harvest();
        if (account != address(0)) {
            rewards[account] = _earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(
        address stakingToken_,
        address rewardToken_,
        address stakingRewards_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) {
        require(stakingToken_ != address(0), "UnifiedWrapper: staking token zero");
        require(rewardToken_ != address(0), "UnifiedWrapper: reward token zero");
        require(stakingRewards_ != address(0), "UnifiedWrapper: staking rewards zero");
        stakingToken = IERC20(stakingToken_);
        rewardToken = IERC20(rewardToken_);
        stakingRewards = IIFLWStakingRewards(stakingRewards_);
        owner = msg.sender;

        stakingToken.forceApprove(stakingRewards_, type(uint256).max);
    }

    function totalUnderlying() public view returns (uint256) {
        return stakingRewards.balances(address(this));
    }

    function deposit(uint256 amount) external nonReentrant updateRewards(msg.sender) {
        require(amount > 0, "UnifiedWrapper: amount zero");
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        stakingRewards.stake(amount);
        _mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 shares) external nonReentrant updateRewards(msg.sender) {
        require(shares > 0, "UnifiedWrapper: shares zero");
        _withdraw(shares, msg.sender, msg.sender);
    }

    function claim() external nonReentrant updateRewards(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "UnifiedWrapper: nothing to claim");
        rewards[msg.sender] = 0;
        rewardToken.safeTransfer(msg.sender, reward);
        emit RewardClaimed(msg.sender, reward);
    }

    function exit() external nonReentrant updateRewards(msg.sender) {
        uint256 shares = balanceOf(msg.sender);
        if (shares > 0) {
            _withdraw(shares, msg.sender, msg.sender);
        }
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardClaimed(msg.sender, reward);
        }
    }

    function sweep(address token, address to, uint256 amount) external onlyOwner {
        require(token != address(stakingToken), "UnifiedWrapper: cannot sweep staking token");
        require(token != address(rewardToken), "UnifiedWrapper: cannot sweep reward token");
        IERC20(token).safeTransfer(to, amount);
    }

    function pendingRewards(address account) external view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 rpt = rewardPerTokenStored;
        if (supply > 0) {
            rpt += (undistributedRewards * PRECISION) / supply;
        }
        return rewards[account] + ((balanceOf(account) * (rpt - userRewardPerTokenPaid[account])) / PRECISION);
    }

    function _withdraw(uint256 shares, address from, address to) internal {
        _burn(from, shares);
        stakingRewards.withdraw(shares);
        stakingToken.safeTransfer(to, shares);
        emit Withdrawn(to, shares);
    }

    function _harvest() internal {
        uint256 beforeBal = rewardToken.balanceOf(address(this));
        stakingRewards.getReward();
        uint256 afterBal = rewardToken.balanceOf(address(this));

        if (afterBal > beforeBal) {
            undistributedRewards += afterBal - beforeBal;
        }

        uint256 supply = totalSupply();
        if (supply > 0 && undistributedRewards > 0) {
            rewardPerTokenStored += (undistributedRewards * PRECISION) / supply;
            undistributedRewards = 0;
        }
    }

    function _earned(address account) internal view returns (uint256) {
        uint256 delta = rewardPerTokenStored - userRewardPerTokenPaid[account];
        uint256 accrued = (balanceOf(account) * delta) / PRECISION;
        return rewards[account] + accrued;
    }
}
