// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IDAOExecutor
 * @notice Interface for the DAO-lite executor (timelock-style) used for proposal execution dry-runs.
 */
interface IDAOExecutor {
    /**
     * @notice Emitted when an action is queued for execution.
     * @param proposalId Identifier of the proposal coordinating this action.
     * @param target Contract targeted by the transaction.
     * @param value ETH value (expected to be zero for the dry-run).
     * @param signature Function signature to call.
     * @param data Encoded calldata (excluding the signature).
     * @param eta Timestamp when the action becomes executable.
     */
    event ActionQueued(
        uint256 indexed proposalId,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    /**
     * @notice Emitted when an action is executed.
     * @param proposalId Identifier of the proposal coordinating this action.
     * @param target Contract targeted by the transaction.
     * @param value ETH value (expected to be zero for the dry-run).
     * @param signature Function signature to call.
     * @param data Encoded calldata (excluding the signature).
     */
    event ActionExecuted(
        uint256 indexed proposalId,
        address indexed target,
        uint256 value,
        string signature,
        bytes data
    );

    /**
     * @notice Emitted when a queued action is cancelled.
     * @param proposalId Identifier of the proposal.
     * @param target Contract targeted by the transaction.
     * @param signature Function signature scheduled.
     */
    event ActionCancelled(uint256 indexed proposalId, address indexed target, string signature);

    /**
     * @notice Queues an action for later execution.
     * @dev Implementations must enforce access control + delay semantics.
     */
    function queueTransaction(
        uint256 proposalId,
        address target,
        uint256 value,
        string calldata signature,
        bytes calldata data,
        uint256 eta
    ) external returns (bytes32);

    /**
     * @notice Executes an action previously queued via `queueTransaction`.
     */
    function executeTransaction(
        uint256 proposalId,
        address target,
        uint256 value,
        string calldata signature,
        bytes calldata data
    ) external payable returns (bytes memory);

    /**
     * @notice Cancels a queued action.
     */
    function cancelTransaction(
        uint256 proposalId,
        address target,
        string calldata signature,
        bytes calldata data
    ) external;
}
