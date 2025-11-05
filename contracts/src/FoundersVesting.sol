// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";

/// @title FoundersVesting
/// @dev Linear vesting wallet with an explicit cliff period for founder allocations.
contract FoundersVesting is VestingWallet {
    /// @dev Tokens unlock linearly over twelve months (365 days) after the cliff.
    uint64 public constant LINEAR_VESTING_PERIOD = 365 days;

    uint64 public immutable cliffDuration;

    constructor(
        address beneficiaryAddress,
        uint64 startTimestamp,
        uint64 cliffDurationSeconds
    ) 
        VestingWallet(beneficiaryAddress, startTimestamp, cliffDurationSeconds + LINEAR_VESTING_PERIOD) 
    {
        require(beneficiaryAddress != address(0), "BeneficiaryZero");
        require(cliffDurationSeconds < LINEAR_VESTING_PERIOD, "CliffTooLong");
        cliffDuration = cliffDurationSeconds;
    }

    /// @dev Overrides vesting schedule to enforce the cliff and twelve month linear release.
    function _vestingSchedule(
        uint256 totalAllocation,
        uint64 timestamp
    ) internal view override returns (uint256) {
        if (timestamp <= start()) {
            return 0;
        }

        uint64 elapsed = uint64(timestamp - start());
        if (elapsed < cliffDuration) {
            return 0;
        }

        uint64 linearElapsed = elapsed - cliffDuration;
        if (linearElapsed >= LINEAR_VESTING_PERIOD) {
            return totalAllocation;
        }

        return (totalAllocation * linearElapsed) / LINEAR_VESTING_PERIOD;
    }
}
