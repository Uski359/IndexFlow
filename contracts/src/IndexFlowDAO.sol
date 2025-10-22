// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

import {IndexFlowToken} from "./IndexFlowToken.sol";
import {IndexFlowData} from "./IndexFlowData.sol";

/// @title IndexFlowDAO - Lightweight controller for protocol parameters and validator registry.
contract IndexFlowDAO is AccessControl {
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    bytes32 public constant ORACLE_MANAGER_ROLE = keccak256("ORACLE_MANAGER_ROLE");

    struct ProtocolParameters {
        uint256 baseReward;
        uint256 challengeBond;
        uint256 validatorQuorumBps;
        uint256 slashPenaltyBps;
    }

    IndexFlowToken public immutable token;
    IndexFlowData public immutable dataRegistry;

    ProtocolParameters public parameters;
    string public oracleEndpoint;

    event ParametersUpdated(ProtocolParameters params);
    event OracleEndpointUpdated(string endpoint);
    event ValidatorRegistered(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event RewardDisbursed(uint256 indexed datasetId, address indexed recipient, uint256 amount);
    event StakeSlashed(address indexed account, uint256 penaltyBps, address indexed recipient);

    constructor(
        address tokenAddress,
        address dataRegistryAddress,
        ProtocolParameters memory initialParams,
        string memory initialOracle
    ) {
        require(tokenAddress != address(0), "token required");
        require(dataRegistryAddress != address(0), "registry required");

        token = IndexFlowToken(tokenAddress);
        dataRegistry = IndexFlowData(dataRegistryAddress);

        parameters = initialParams;
        oracleEndpoint = initialOracle;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
        _grantRole(ORACLE_MANAGER_ROLE, msg.sender);
    }

    function updateParameters(ProtocolParameters calldata newParams) external onlyRole(GOVERNOR_ROLE) {
        require(newParams.baseReward > 0, "base reward required");
        require(newParams.challengeBond > 0, "bond required");
        require(newParams.validatorQuorumBps <= 10_000, "invalid quorum");
        require(newParams.slashPenaltyBps <= 10_000, "invalid slash");
        parameters = newParams;
        emit ParametersUpdated(newParams);
    }

    function setOracleEndpoint(string calldata endpoint) external onlyRole(ORACLE_MANAGER_ROLE) {
        require(bytes(endpoint).length > 0, "endpoint required");
        oracleEndpoint = endpoint;
        emit OracleEndpointUpdated(endpoint);
    }

    function registerValidator(address validator) external onlyRole(GOVERNOR_ROLE) {
        require(validator != address(0), "validator required");
        require(
            !dataRegistry.hasRole(dataRegistry.VALIDATOR_ROLE(), validator),
            "validator exists"
        );
        dataRegistry.grantRole(dataRegistry.VALIDATOR_ROLE(), validator);
        emit ValidatorRegistered(validator);
    }

    function removeValidator(address validator) external onlyRole(GOVERNOR_ROLE) {
        require(
            dataRegistry.hasRole(dataRegistry.VALIDATOR_ROLE(), validator),
            "validator missing"
        );
        dataRegistry.revokeRole(dataRegistry.VALIDATOR_ROLE(), validator);
        emit ValidatorRemoved(validator);
    }

    function resolveChallenge(
        uint256 datasetId,
        bool upholdChallenge,
        uint256 slashAmount,
        address recipient
    ) external onlyRole(GOVERNOR_ROLE) {
        dataRegistry.resolveChallenge(datasetId, upholdChallenge, slashAmount, recipient);
    }

    function updateTokenApy(IndexFlowToken.StakeMode mode, uint256 basisPoints) external onlyRole(GOVERNOR_ROLE) {
        token.setApy(mode, basisPoints);
    }

    function slashStake(
        address staker,
        uint256 penaltyBps,
        address recipient
    ) external onlyRole(GOVERNOR_ROLE) {
        require(penaltyBps <= parameters.slashPenaltyBps, "penalty above limit");
        token.slash(staker, penaltyBps, recipient);
        emit StakeSlashed(staker, penaltyBps, recipient);
    }

    function disburseReward(
        uint256 datasetId,
        address recipient,
        uint256 amount
    ) external onlyRole(GOVERNOR_ROLE) {
        dataRegistry.payReward(datasetId, recipient, amount);
        emit RewardDisbursed(datasetId, recipient, amount);
    }
}
