// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ValidatorRegistry
 * @notice Tracks validator metadata for the IndexFlow proof-of-indexing demo.
 */
contract ValidatorRegistry {
    struct Validator {
        address node;
        uint256 stake;
        bool active;
        uint256 lastProof;
    }

    struct Metadata {
        string name;
        string endpoint;
    }

    mapping(address => Validator) private _validators;
    mapping(address => Metadata) private _metadata;
    address[] private _validatorIndex;

    address public owner;
    address public stakingContract;

    event ValidatorRegistered(address indexed node, uint256 timestamp);
    event ValidatorDeactivated(address indexed node, uint256 timestamp);
    event StakeUpdated(address indexed node, uint256 newStake);
    event ProofTimestampUpdated(address indexed node, uint256 lastProof);
    event StakingContractSet(address indexed stakingContract);
    event ValidatorMetadataUpdated(address indexed node, string name, string endpoint);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyStaking() {
        require(msg.sender == stakingContract, "Not staking contract");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setStakingContract(address _staking) external onlyOwner {
        require(_staking != address(0), "Invalid staking address");
        stakingContract = _staking;
        emit StakingContractSet(_staking);
    }

    function register() external {
        Validator storage existing = _validators[msg.sender];
        require(!existing.active, "Validator already active");

        if (existing.node == address(0)) {
            existing.node = msg.sender;
            _validatorIndex.push(msg.sender);
        }

        existing.active = true;
        existing.lastProof = block.timestamp;

        emit ValidatorRegistered(msg.sender, block.timestamp);
    }

    function deactivate() external {
        Validator storage validator = _validators[msg.sender];
        require(validator.active, "Validator not active");
        validator.active = false;
        emit ValidatorDeactivated(msg.sender, block.timestamp);
    }

    function getActiveValidators() external view returns (Validator[] memory) {
        uint256 activeCount;
        for (uint256 i = 0; i < _validatorIndex.length; i++) {
            if (_validators[_validatorIndex[i]].active) {
                activeCount++;
            }
        }

        Validator[] memory activeValidators = new Validator[](activeCount);
        uint256 pos;
        for (uint256 i = 0; i < _validatorIndex.length; i++) {
            Validator memory validator = _validators[_validatorIndex[i]];
            if (validator.active) {
                activeValidators[pos] = validator;
                pos++;
            }
        }

        return activeValidators;
    }

    function getValidator(address node) external view returns (Validator memory) {
        return _validators[node];
    }

    function isValidator(address node) external view returns (bool) {
        return _validators[node].active;
    }

    function validatorStake(address node) external view returns (uint256) {
        return _validators[node].stake;
    }

    function setMetadata(string calldata name, string calldata endpoint) external {
        Validator storage validator = _validators[msg.sender];
        require(validator.node != address(0), "Validator not found");
        _metadata[msg.sender] = Metadata({name: name, endpoint: endpoint});
        emit ValidatorMetadataUpdated(msg.sender, name, endpoint);
    }

    function validatorMetadata(address node) external view returns (string memory name, string memory endpoint) {
        Metadata storage meta = _metadata[node];
        return (meta.name, meta.endpoint);
    }

    function updateStake(address node, uint256 newStake) external onlyStaking {
        Validator storage validator = _validators[node];
        require(validator.node != address(0), "Validator not found");
        validator.stake = newStake;
        emit StakeUpdated(node, newStake);
    }

    function updateLastProof(address node, uint256 timestamp) external onlyStaking {
        Validator storage validator = _validators[node];
        require(validator.node != address(0), "Validator not found");
        validator.lastProof = timestamp;
        emit ProofTimestampUpdated(node, timestamp);
    }
}
