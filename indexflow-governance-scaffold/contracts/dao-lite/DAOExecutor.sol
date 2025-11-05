// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IDAOExecutor} from "./interfaces/IDAOExecutor.sol";

/**
 * @title DAOExecutor
 * @notice Timelock-style executor skeleton for IndexFlow's DAO-lite governance dry-runs.
 * @dev This contract intentionally exposes modifiers, events, and storage but leaves core
 *      scheduling logic unimplemented. Post-funding, wire in access control, safe delays,
 *      and call whitelists before ever touching mainnet funds.
 */
abstract contract DAOExecutor is IDAOExecutor {
    /// @notice Minimum delay between queueing and execution (seconds).
    uint256 public immutable minDelay;

    /// @notice Governance admin with rights to schedule and manage actions.
    address public admin;

    /// @notice Admin candidate pending acceptance.
    address public pendingAdmin;

    /// @notice Underlying delay to enforce between queue and execute; set in constructor.
    uint256 public delay;

    /**
     * @notice Enforces that only the active admin can call the function.
     */
    modifier onlyAdmin() {
        require(msg.sender == admin, "DAOExecutor: admin only");
        _;
    }

    /**
     * @notice Enforces that only the pending admin can call the function.
     */
    modifier onlyPendingAdmin() {
        require(msg.sender == pendingAdmin, "DAOExecutor: pending admin only");
        _;
    }

    /**
     * @notice Emitted when the admin role transitions to a new address.
     * @param oldAdmin Previous admin address.
     * @param newAdmin New admin address.
     */
    event NewAdmin(address indexed oldAdmin, address indexed newAdmin);

    /**
     * @notice Emitted when a pending admin is nominated.
     * @param oldPending Previous pending admin.
     * @param newPending Newly assigned pending admin.
     */
    event NewPendingAdmin(address indexed oldPending, address indexed newPending);

    /**
     * @notice Emitted when the execution delay is updated.
     * @param oldDelay Previous delay in seconds.
     * @param newDelay New delay in seconds.
     */
    event NewDelay(uint256 oldDelay, uint256 newDelay);

    /**
     * @param admin_ Initial admin address (e.g., DAO-lite governor).
     * @param delay_ Initial execution delay in seconds.
     * @param minDelay_ Minimum permissible delay enforced by the contract.
     */
    constructor(address admin_, uint256 delay_, uint256 minDelay_) {
        require(admin_ != address(0), "DAOExecutor: admin zero");
        require(delay_ >= minDelay_, "DAOExecutor: delay < min");
        admin = admin_;
        delay = delay_;
        minDelay = minDelay_;
    }

    /**
     * @notice Sets a new pending admin who must accept the role.
     * @param newPending Address nominated as the next admin.
     */
    function setPendingAdmin(address newPending) external onlyAdmin {
        address oldPending = pendingAdmin;
        pendingAdmin = newPending;
        emit NewPendingAdmin(oldPending, newPending);
    }

    /**
     * @notice Allows the pending admin to accept and become the active admin.
     */
    function acceptAdmin() external onlyPendingAdmin {
        address oldAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit NewAdmin(oldAdmin, admin);
    }

    /**
     * @notice Updates the execution delay.
     * @param newDelay Proposed new delay in seconds.
     */
    function setDelay(uint256 newDelay) external onlyAdmin {
        require(newDelay >= minDelay, "DAOExecutor: delay < min");
        uint256 oldDelay = delay;
        delay = newDelay;
        emit NewDelay(oldDelay, newDelay);
    }

    /**
     * @dev Queue/execute/cancel functions are declared via the interface.
     *      Concrete implementations must protect against reentrancy and replay attacks.
     *      TODO: add timelock queue bookkeeping and call whitelists before production.
     */
}
