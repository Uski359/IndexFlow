// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title IndexFlowToken
/// @notice IFLW governance and utility token with predefined tokenomics and role-based controls.
contract IndexFlowToken is ERC20, ERC20Permit, ERC20Votes, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    uint256 private constant FOUNDER_SHARE = (TOTAL_SUPPLY * 15) / 100;
    uint256 private constant DAO_SHARE = (TOTAL_SUPPLY * 35) / 100;
    uint256 private constant COMMUNITY_SHARE = (TOTAL_SUPPLY * 25) / 100;
    uint256 private constant AIRDROP_SHARE = (TOTAL_SUPPLY * 10) / 100;
    uint256 private constant RESERVE_SHARE = TOTAL_SUPPLY - FOUNDER_SHARE - DAO_SHARE - COMMUNITY_SHARE - AIRDROP_SHARE;

    struct Distribution {
        address foundersVesting;
        address daoTreasury;
        address communityAllocation;
        address airdropVault;
        address ecosystemReserve;
    }

    event DistributionCompleted(address indexed executor, Distribution distribution);

    constructor(Distribution memory distribution, address admin)
        ERC20("IndexFlow", "IFLW")
        ERC20Permit("IndexFlow")
    {
        require(admin != address(0), "AdminZero");
        _validateDistribution(distribution);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(TREASURY_ROLE, distribution.daoTreasury);

        _mint(distribution.foundersVesting, FOUNDER_SHARE);
        _mint(distribution.daoTreasury, DAO_SHARE);
        _mint(distribution.communityAllocation, COMMUNITY_SHARE);
        _mint(distribution.airdropVault, AIRDROP_SHARE);
        _mint(distribution.ecosystemReserve, RESERVE_SHARE);

        emit DistributionCompleted(_msgSender(), distribution);
    }

    function _validateDistribution(Distribution memory distribution) internal pure {
        require(distribution.foundersVesting != address(0), "FoundersZero");
        require(distribution.daoTreasury != address(0), "TreasuryZero");
        require(distribution.communityAllocation != address(0), "CommunityZero");
        require(distribution.airdropVault != address(0), "AirdropZero");
        require(distribution.ecosystemReserve != address(0), "ReserveZero");
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
        whenNotPaused
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
