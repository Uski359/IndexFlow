// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ValidatorRegistry.sol";

/**
 * @title StakingRewards
 * @notice Handles validator staking balances and proof submissions for IndexFlow.
 */
contract StakingRewards {
    ValidatorRegistry public immutable registry;
    address public admin;
    address public rewardManager;

    uint256 public baseReward;
    uint256 public uptimeMultiplier; // reward added per proof interval second
    uint256 public constant PROOF_INTERVAL = 5 minutes;

    mapping(address => uint256) public stakes;
    mapping(bytes32 => bool) public proofHashUsed;

    event StakeDeposited(address indexed validator, uint256 amount, uint256 totalStake);
    event StakeWithdrawn(address indexed validator, uint256 amount, uint256 remainingStake);
    event ProofSubmitted(address indexed validator, bytes32 proofHash, uint256 reward);
    event ValidatorRewarded(address indexed validator, uint256 rewardAmount);
    event RewardParametersUpdated(uint256 baseReward, uint256 uptimeMultiplier);
    event RewardManagerUpdated(address indexed rewardManager);
    event RewardPoolFunded(address indexed funder, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyRewardManager() {
        require(msg.sender == rewardManager, "Not reward manager");
        _;
    }

    constructor(
        address registryAddress,
        uint256 _baseReward,
        uint256 _uptimeMultiplier
    ) payable {
        require(registryAddress != address(0), "Registry required");
        registry = ValidatorRegistry(registryAddress);
        admin = msg.sender;
        rewardManager = msg.sender;
        baseReward = _baseReward;
        uptimeMultiplier = _uptimeMultiplier;
    }

    receive() external payable {
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    function fundRewardPool() external payable onlyAdmin {
        require(msg.value > 0, "Zero funding");
        emit RewardPoolFunded(msg.sender, msg.value);
    }

    function setRewardParameters(uint256 _baseReward, uint256 _uptimeMultiplier) external onlyAdmin {
        baseReward = _baseReward;
        uptimeMultiplier = _uptimeMultiplier;
        emit RewardParametersUpdated(_baseReward, _uptimeMultiplier);
    }

    function setRewardManager(address _rewardManager) external onlyAdmin {
        require(_rewardManager != address(0), "Invalid reward manager");
        rewardManager = _rewardManager;
        emit RewardManagerUpdated(_rewardManager);
    }

    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        ValidatorRegistry.Validator memory validator = registry.getValidator(msg.sender);
        require(validator.active, "Validator inactive");

        stakes[msg.sender] += msg.value;
        registry.updateStake(msg.sender, stakes[msg.sender]);

        emit StakeDeposited(msg.sender, msg.value, stakes[msg.sender]);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "Zero withdraw");
        require(stakes[msg.sender] >= amount, "Insufficient stake");

        stakes[msg.sender] -= amount;
        registry.updateStake(msg.sender, stakes[msg.sender]);

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit StakeWithdrawn(msg.sender, amount, stakes[msg.sender]);
    }

    function submitProof(bytes32 proofHash) external {
        require(!proofHashUsed[proofHash], "Proof already submitted");
        ValidatorRegistry.Validator memory validator = registry.getValidator(msg.sender);

        require(validator.active, "Validator inactive");
        require(stakes[msg.sender] > 0, "No stake");

        proofHashUsed[proofHash] = true;
        uint256 reward = _calculateReward(validator.lastProof);

        registry.updateLastProof(msg.sender, block.timestamp);
        _distributeReward(msg.sender, reward);

        emit ProofSubmitted(msg.sender, proofHash, reward);
    }

    function rewardValidator(address validator, uint256 rewardAmount) public onlyRewardManager {
        _distributeReward(validator, rewardAmount);
    }

    function _distributeReward(address validator, uint256 rewardAmount) internal {
        require(rewardAmount > 0, "Zero reward");
        require(address(this).balance >= rewardAmount, "Insufficient rewards");

        stakes[validator] += rewardAmount;
        registry.updateStake(validator, stakes[validator]);

        emit ValidatorRewarded(validator, rewardAmount);
    }

    function _calculateReward(uint256 lastProof) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - lastProof;
        uint256 uptimeBonus = (elapsed * uptimeMultiplier) / PROOF_INTERVAL;
        return baseReward + uptimeBonus;
    }
}
