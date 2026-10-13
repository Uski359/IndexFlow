// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title DAOExecutor
/// @notice Minimal timelock-style executor that enforces a delay between queueing and executing governance actions.
///         This skeleton intentionally omits guardrails that would be required for mainnet deployments and is meant
///         to orchestrate IndexFlow's DAO-lite experiments on test networks only.
contract DAOExecutor {
    event Queued(bytes32 indexed txHash, address indexed target, uint256 value, string signature, bytes data, uint256 eta);
    event Executed(bytes32 indexed txHash, address indexed target, uint256 value);
    event Cancelled(bytes32 indexed txHash);
    event DelayUpdated(uint256 newDelay);
    event RoleUpdated(string role, address indexed newAccount);

    uint256 public constant MINIMUM_DELAY = 2 hours;
    uint256 public constant MAXIMUM_DELAY = 14 days;

    address public admin;
    address public proposer;
    address public validator;
    address public governor;
    uint256 public delay;

    mapping(bytes32 => uint256) public queuedTransactions;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Executor: admin only");
        _;
    }

    modifier onlyProposer() {
        require(msg.sender == proposer, "Executor: proposer only");
        _;
    }

    modifier onlyValidator() {
        require(
            msg.sender == validator || msg.sender == admin || msg.sender == governor,
            "Executor: validator only"
        );
        _;
    }

    constructor(address admin_, address proposer_, address validator_, uint256 delay_) {
        require(admin_ != address(0), "Executor: admin zero");
        require(proposer_ != address(0), "Executor: proposer zero");
        require(validator_ != address(0), "Executor: validator zero");
        require(delay_ >= MINIMUM_DELAY && delay_ <= MAXIMUM_DELAY, "Executor: delay bounds");
        admin = admin_;
        proposer = proposer_;
        validator = validator_;
        delay = delay_;
    }

    receive() external payable {}

    function updateDelay(uint256 delay_) external onlyAdmin {
        require(delay_ >= MINIMUM_DELAY && delay_ <= MAXIMUM_DELAY, "Executor: delay bounds");
        delay = delay_;
        emit DelayUpdated(delay_);
    }

    function updateProposer(address newProposer) external onlyAdmin {
        require(newProposer != address(0), "Executor: proposer zero");
        proposer = newProposer;
        emit RoleUpdated("PROPOSER", newProposer);
    }

    function updateValidator(address newValidator) external onlyAdmin {
        require(newValidator != address(0), "Executor: validator zero");
        validator = newValidator;
        emit RoleUpdated("VALIDATOR", newValidator);
    }

    function setGovernor(address newGovernor) external onlyAdmin {
        require(newGovernor != address(0), "Executor: governor zero");
        governor = newGovernor;
        emit RoleUpdated("GOVERNOR", newGovernor);
    }

    function queueTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyProposer returns (bytes32) {
        require(eta >= block.timestamp + delay, "Executor: eta too soon");
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        queuedTransactions[txHash] = eta;

        emit Queued(txHash, target, value, signature, data, eta);
        return txHash;
    }

    function cancelTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyAdmin {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(queuedTransactions[txHash] != 0, "Executor: not queued");
        delete queuedTransactions[txHash];
        emit Cancelled(txHash);
    }

    function executeTransaction(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) external onlyValidator returns (bytes memory) {
        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        uint256 queuedEta = queuedTransactions[txHash];
        require(queuedEta != 0, "Executor: not queued");
        require(block.timestamp >= queuedEta, "Executor: locked");
        require(block.timestamp <= queuedEta + 30 days, "Executor: stale");
        delete queuedTransactions[txHash];

        bytes memory callData;
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Executor: exec failed");
        emit Executed(txHash, target, value);
        return returnData;
    }
}

