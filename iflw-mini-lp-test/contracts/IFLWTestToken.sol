// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title IFLWTestToken
/// @notice Simple mintable ERC20 used for IndexFlow LP experiments on testnets.
contract IFLWTestToken is ERC20 {
    /// @notice Address allowed to mint new tokens.
    address public immutable admin;

    uint8 private constant FIXED_DECIMALS = 18;

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        admin = msg.sender;
    }

    /// @notice Mints `amount` tokens to `recipient`. Only the deployer can mint.
    function mint(address recipient, uint256 amount) external {
        require(msg.sender == admin, "IFLWTestToken: not admin");
        _mint(recipient, amount);
    }

    function decimals() public pure override returns (uint8) {
        return FIXED_DECIMALS;
    }
}
