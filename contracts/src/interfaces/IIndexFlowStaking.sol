// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIndexFlowStaking {
    function totalStaked() external view returns (uint256);
    function balances(address account) external view returns (uint256);
    function notifyReward(uint256 amount, bytes32 batchId) external;
}
