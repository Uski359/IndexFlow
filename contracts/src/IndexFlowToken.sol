// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IndexFlowToken - ERC20 token with built-in staking mechanics.
contract IndexFlowToken is ERC20, Ownable, ReentrancyGuard {
    enum StakeMode {
        Passive,
        Active
    }

    struct StakeInfo {
        uint256 amount;
        uint256 rewardAccrued;
        uint256 lastUpdated;
        uint256 lockUntil;
        StakeMode mode;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(uint8 => uint256) private apyByMode;

    uint256 public constant BASIS_POINTS = 10_000;
    uint256 public constant MIN_LOCK_DURATION = 7 days;

    address public immutable treasury;

    event Staked(address indexed account, uint256 amount, StakeMode mode, uint256 lockUntil);
    event Unstaked(address indexed account, uint256 amount);
    event RewardsClaimed(address indexed account, uint256 amount);
    event Slashed(address indexed account, uint256 amount, address indexed recipient);
    event APYUpdated(StakeMode mode, uint256 basisPoints);

    constructor(address treasuryAddress) ERC20("IndexFlow", "IFLW") Ownable(msg.sender) {
        require(treasuryAddress != address(0), "treasury required");
        treasury = treasuryAddress;

        // Allocate supply: 60% to treasury, 40% to reward pool.
        _mint(treasuryAddress, 600_000_000 ether);
        _mint(address(this), 400_000_000 ether);

        apyByMode[uint8(StakeMode.Passive)] = 1200; // 12%
        apyByMode[uint8(StakeMode.Active)] = 1800; // 18%
    }

    function stake(uint256 amount, uint256 lockDuration, StakeMode mode) external nonReentrant {
        require(amount > 0, "amount too low");
        require(lockDuration >= MIN_LOCK_DURATION, "lock too short");
        require(uint8(mode) <= uint8(StakeMode.Active), "invalid mode");

        StakeInfo storage info = stakes[msg.sender];
        _updateRewards(info);

        _spendAllowance(msg.sender, address(this), amount);
        _transfer(msg.sender, address(this), amount);

        uint256 previousLockUntil = info.lockUntil;

        info.amount += amount;
        info.mode = mode;

        uint256 proposedUnlock = block.timestamp + lockDuration;
        if (previousLockUntil > block.timestamp && previousLockUntil > proposedUnlock) {
            // Preserve active longer locks when restaking.
            info.lockUntil = previousLockUntil;
        } else {
            info.lockUntil = proposedUnlock;
        }
        info.lastUpdated = block.timestamp;

        emit Staked(msg.sender, amount, mode, info.lockUntil);
    }

    function unstake(uint256 amount) external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        require(info.amount > 0, "nothing staked");
        require(amount > 0 && amount <= info.amount, "invalid amount");
        require(block.timestamp >= info.lockUntil, "stake locked");

        _updateRewards(info);

        info.amount -= amount;
        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        _updateRewards(info);

        uint256 payout = info.rewardAccrued;
        require(payout > 0, "nothing to claim");
        require(balanceOf(address(this)) >= payout, "reward pool empty");

        info.rewardAccrued = 0;
        _transfer(address(this), msg.sender, payout);

        emit RewardsClaimed(msg.sender, payout);
    }

    function slash(address account, uint256 penaltyBps, address recipient) external onlyOwner {
        require(account != address(0), "invalid account");
        require(penaltyBps <= BASIS_POINTS, "invalid basis points");

        StakeInfo storage info = stakes[account];
        _updateRewards(info);

        uint256 penaltyAmount = (info.amount * penaltyBps) / BASIS_POINTS;
        if (penaltyAmount > info.amount) {
            penaltyAmount = info.amount;
        }

        info.amount -= penaltyAmount;

        if (recipient == address(0)) {
            _burn(address(this), penaltyAmount);
        } else {
            _transfer(address(this), recipient, penaltyAmount);
        }

        emit Slashed(account, penaltyAmount, recipient);
    }

    function pendingRewards(address account) external view returns (uint256) {
        StakeInfo memory info = stakes[account];
        if (info.amount == 0) {
            return info.rewardAccrued;
        }

        uint256 elapsed = block.timestamp - info.lastUpdated;
        uint256 apyRate = apyByMode[uint8(info.mode)];
        uint256 extra = (info.amount * apyRate * elapsed) / BASIS_POINTS / 365 days;
        return info.rewardAccrued + extra;
    }

    function apy(StakeMode mode) external view returns (uint256) {
        return apyByMode[uint8(mode)];
    }

    function setApy(StakeMode mode, uint256 basisPoints) external onlyOwner {
        require(basisPoints <= 5000, "apy too high");
        apyByMode[uint8(mode)] = basisPoints;
        emit APYUpdated(mode, basisPoints);
    }

    function _updateRewards(StakeInfo storage info) internal {
        if (info.amount == 0) {
            info.lastUpdated = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - info.lastUpdated;
        if (elapsed == 0) {
            return;
        }

        uint256 apyRate = apyByMode[uint8(info.mode)];
        uint256 reward = (info.amount * apyRate * elapsed) / BASIS_POINTS / 365 days;
        info.rewardAccrued += reward;
        info.lastUpdated = block.timestamp;
    }
}
