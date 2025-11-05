// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title IndexFlowTreasury
/// @notice Token treasury controlled by the DAO for managing protocol reserves.
contract IndexFlowTreasury is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");

    IERC20 public immutable token;
    address public rewardsContract;

    event RewardsContractUpdated(address indexed executor, address indexed newRewardsContract);
    event FundsDeposited(address indexed sender, uint256 amount);
    event FundsWithdrawn(address indexed executor, address indexed recipient, uint256 amount, bytes32 tag);
    event RewardsFunded(address indexed strategist, uint256 amount);

    constructor(IERC20 tokenAddress, address daoMultisig, address strategist) {
        require(address(tokenAddress) != address(0), "TokenZero");
        require(daoMultisig != address(0), "DaoZero");
        require(strategist != address(0), "StrategistZero");

        token = tokenAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, daoMultisig);
        _grantRole(EXECUTOR_ROLE, daoMultisig);
        _grantRole(STRATEGIST_ROLE, strategist);
    }

    function setRewardsContract(address newRewardsContract) external onlyRole(EXECUTOR_ROLE) {
        require(newRewardsContract != address(0), "RewardsZero");
        rewardsContract = newRewardsContract;
        emit RewardsContractUpdated(_msgSender(), newRewardsContract);
    }

    function pause() external onlyRole(EXECUTOR_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(EXECUTOR_ROLE) {
        _unpause();
    }

    function deposit(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "AmountZero");
        token.safeTransferFrom(_msgSender(), address(this), amount);
        emit FundsDeposited(_msgSender(), amount);
    }

    function withdraw(address recipient, uint256 amount, bytes32 tag) external whenNotPaused nonReentrant onlyRole(EXECUTOR_ROLE) {
        require(recipient != address(0), "RecipientZero");
        require(amount > 0, "AmountZero");
        token.safeTransfer(recipient, amount);
        emit FundsWithdrawn(_msgSender(), recipient, amount, tag);
    }

    function fundRewards(uint256 amount) external whenNotPaused nonReentrant onlyRole(STRATEGIST_ROLE) {
        require(rewardsContract != address(0), "RewardsUnset");
        require(amount > 0, "AmountZero");
        token.safeTransfer(rewardsContract, amount);
        emit RewardsFunded(_msgSender(), amount);
    }
}
