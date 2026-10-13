// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ContributionRegistry
/// @notice Simple on-chain log for Share-to-Earn/Data-to-Earn signals.
contract ContributionRegistry {
    mapping(address => uint256) public totalWeights;

    event ContributionRecorded(
        address indexed user,
        string contributionType,
        uint256 weight,
        uint256 timestamp
    );

    /// @notice Record a weighted contribution for a user.
    /// @dev Emits an event to be indexed off-chain for reward campaigns.
    function recordContribution(address user, string calldata contributionType, uint256 weight) external {
        require(user != address(0), "UserZero");
        require(weight > 0, "WeightZero");

        totalWeights[user] += weight;

        emit ContributionRecorded(user, contributionType, weight, block.timestamp);
    }
}
