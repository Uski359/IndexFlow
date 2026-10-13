// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TreasuryMock
 * @notice Emits events to mimic inflows/outflows without handling real assets.
 * @dev All functions revert after emitting events to guarantee no value transfer occurs.
 */
contract TreasuryMock {
    /// @notice Emitted when the contract receives an attempted deposit.
    event MockDeposit(address indexed from, uint256 amount, string memo);

    /// @notice Emitted when a withdrawal is requested.
    event MockWithdrawalRequested(address indexed to, uint256 amount, string memo);

    /**
     * @notice Solidity receive hook, emits an event and reverts to avoid accepting ETH.
     */
    receive() external payable {
        emit MockDeposit(msg.sender, msg.value, "Dry-run deposit detected");
        revert("TreasuryMock: value not accepted");
    }

    /**
     * @notice Simulates a withdrawal flow without moving funds.
     * @param to Address that would receive the funds in production.
     * @param amount Amount requested.
     * @param memo Description for logging purposes.
     */
    function requestWithdrawal(address to, uint256 amount, string calldata memo) external {
        emit MockWithdrawalRequested(to, amount, memo);
        revert("TreasuryMock: dry-run only");
    }

    /**
     * @notice TODO: Replace with audited treasury implementation post-funding, incorporating multisig safeguards.
     */
}
