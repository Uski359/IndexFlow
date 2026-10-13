// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC20Minimal
 * @notice Stripped down ERC20 interface used for governance dry-runs.
 * @dev Only the methods required for future voting power integrations are kept.
 */
interface IERC20Minimal {
    /**
     * @notice Returns the token balance of an account.
     * @param account The address to query.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Returns the total token supply.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Transfers tokens to a recipient.
     * @param recipient Destination of the transfer.
     * @param amount Quantity to move.
     * @return success True when the transfer succeeds.
     */
    function transfer(address recipient, uint256 amount) external returns (bool success);
}
