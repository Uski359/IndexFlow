// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title IndexFlowData - Registry for dataset submissions and Proof of SQL attestations.
contract IndexFlowData is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    enum Status {
        Pending,
        Indexed,
        Challenged,
        Rejected
    }

    struct Dataset {
        address submitter;
        string metadataURI;
        bytes32 contentHash;
        bytes32 poiHash;
        bytes32 sqlHash;
        uint8 qualityScore;
        uint256 stakeRequired;
        uint256 baseReward;
        Status status;
        uint256 submittedAt;
    }

    struct Challenge {
        address challenger;
        string reason;
        uint256 bond;
        bool resolved;
        bool upheld;
    }

    IERC20 public immutable token;
    uint256 public datasetCount;

    mapping(uint256 => Dataset) public datasets;
    mapping(uint256 => Challenge) public challenges;

    event DatasetSubmitted(
        uint256 indexed datasetId,
        address indexed submitter,
        bytes32 contentHash,
        uint256 stakeRequired,
        uint256 reward
    );

    event ProofRecorded(
        uint256 indexed datasetId,
        bytes32 poiHash,
        bytes32 sqlHash,
        uint8 qualityScore
    );

    event DatasetChallenged(
        uint256 indexed datasetId,
        address indexed challenger,
        string reason,
        uint256 bond
    );

    event ChallengeResolved(uint256 indexed datasetId, bool upheld);

    event RewardPaid(uint256 indexed datasetId, address indexed recipient, uint256 amount);
    event PenaltyTransferred(uint256 indexed datasetId, address indexed recipient, uint256 amount);

    constructor(address tokenAddress, address daoAddress, address validator) {
        require(tokenAddress != address(0), "token required");
        require(daoAddress != address(0), "dao required");

        token = IERC20(tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, daoAddress);
        _grantRole(DAO_ROLE, daoAddress);
        _grantRole(VALIDATOR_ROLE, validator);
    }

    function submitDataset(
        string calldata metadataURI,
        bytes32 contentHash,
        uint256 stakeRequired,
        uint256 baseReward
    ) external returns (uint256 datasetId) {
        require(bytes(metadataURI).length > 0, "metadata required");
        require(contentHash != bytes32(0), "content hash required");
        require(stakeRequired > 0, "stake required");
        require(baseReward > 0, "reward required");

        datasetId = ++datasetCount;

        datasets[datasetId] = Dataset({
            submitter: msg.sender,
            metadataURI: metadataURI,
            contentHash: contentHash,
            poiHash: bytes32(0),
            sqlHash: bytes32(0),
            qualityScore: 0,
            stakeRequired: stakeRequired,
            baseReward: baseReward,
            status: Status.Pending,
            submittedAt: block.timestamp
        });

        emit DatasetSubmitted(datasetId, msg.sender, contentHash, stakeRequired, baseReward);
    }

    function recordProof(
        uint256 datasetId,
        bytes32 poiHash,
        bytes32 sqlHash,
        uint8 qualityScore
    ) external onlyRole(VALIDATOR_ROLE) {
        Dataset storage dataset = datasets[datasetId];
        require(dataset.submitter != address(0), "dataset missing");
        require(qualityScore <= 100, "quality out of range");
        require(dataset.status != Status.Rejected, "dataset rejected");
        require(
            dataset.status == Status.Pending || dataset.status == Status.Challenged,
            "invalid status"
        );
        require(poiHash != bytes32(0) && sqlHash != bytes32(0), "proof hashes required");

        dataset.poiHash = poiHash;
        dataset.sqlHash = sqlHash;
        dataset.qualityScore = qualityScore;
        dataset.status = Status.Indexed;

        emit ProofRecorded(datasetId, poiHash, sqlHash, qualityScore);
    }

    function challengeDataset(
        uint256 datasetId,
        string calldata reason,
        uint256 bond
    ) external nonReentrant {
        Dataset storage dataset = datasets[datasetId];
        require(dataset.submitter != address(0), "dataset missing");
        require(dataset.status == Status.Indexed || dataset.status == Status.Pending, "cannot challenge");
        require(bytes(reason).length > 10, "reason too short");
        require(bond > 0, "bond required");
        require(msg.sender != dataset.submitter, "self challenge blocked");

        Challenge storage challengeData = challenges[datasetId];
        if (challengeData.challenger != address(0)) {
            require(challengeData.resolved, "challenge exists");
            delete challenges[datasetId];
            challengeData = challenges[datasetId];
        }

        token.safeTransferFrom(msg.sender, address(this), bond);

        challengeData.challenger = msg.sender;
        challengeData.reason = reason;
        challengeData.bond = bond;
        challengeData.resolved = false;
        challengeData.upheld = false;

        dataset.status = Status.Challenged;

        emit DatasetChallenged(datasetId, msg.sender, reason, bond);
    }

    function resolveChallenge(
        uint256 datasetId,
        bool upholdChallenge,
        uint256 slashAmount,
        address recipient
    ) external onlyRole(DAO_ROLE) nonReentrant {
        Dataset storage dataset = datasets[datasetId];
        Challenge storage challengeData = challenges[datasetId];

        require(challengeData.challenger != address(0), "no challenge");
        require(!challengeData.resolved, "already resolved");

        challengeData.resolved = true;
        challengeData.upheld = upholdChallenge;

        if (upholdChallenge) {
            dataset.status = Status.Rejected;
            token.safeTransfer(challengeData.challenger, challengeData.bond);
            if (slashAmount > 0) {
                require(recipient != address(0), "recipient required");
                require(
                    slashAmount <= token.balanceOf(address(this)),
                    "insufficient slash balance"
                );
                token.safeTransfer(recipient, slashAmount);
                emit PenaltyTransferred(datasetId, recipient, slashAmount);
            }
        } else {
            dataset.status = Status.Indexed;
            token.safeTransfer(dataset.submitter, challengeData.bond);
        }

        emit ChallengeResolved(datasetId, upholdChallenge);
    }

    function payReward(
        uint256 datasetId,
        address recipient,
        uint256 amount
    ) external onlyRole(DAO_ROLE) nonReentrant {
        Dataset storage dataset = datasets[datasetId];
        require(dataset.submitter != address(0), "dataset missing");
        require(dataset.status == Status.Indexed, "dataset not indexed");
        require(recipient != address(0), "recipient required");
        require(amount > 0, "amount required");
        require(amount <= token.balanceOf(address(this)), "insufficient balance");

        token.safeTransfer(recipient, amount);
        emit RewardPaid(datasetId, recipient, amount);
    }

    function datasetDetails(uint256 datasetId) external view returns (Dataset memory) {
        return datasets[datasetId];
    }

    function challengeDetails(uint256 datasetId) external view returns (Challenge memory) {
        return challenges[datasetId];
    }
}
