// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title TreasuryMock
/// @notice Testnet-only treasury that records deposits and requested withdrawals without moving funds.
contract TreasuryMock {
    address public dao;

    event Deposit(address indexed from, uint256 amount, string memo);
    event WithdrawalRequested(address indexed to, uint256 amount, bytes32 indexed proposalHash);
    event DAOUpdated(address indexed newDAO);

    modifier onlyDAO() {
        require(msg.sender == dao, "Treasury: DAO only");
        _;
    }

    constructor(address dao_) {
        dao = dao_;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value, "native");
    }

    function setDAO(address newDAO) external onlyDAO {
        require(newDAO != address(0), "Treasury: DAO zero");
        dao = newDAO;
        emit DAOUpdated(newDAO);
    }

    /// @notice Logs a withdrawal request. The function intentionally does not transfer funds to remain testnet-only.
    function withdraw(address payable to, uint256 amount, bytes32 proposalHash) external onlyDAO {
        emit WithdrawalRequested(to, amount, proposalHash);
        // The transfer is intentionally omitted to ensure funds never leave the test treasury on testnets.
    }
}

