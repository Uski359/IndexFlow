// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofOfIndexing
/// @notice Lightweight registry for indexer PoI submissions per chain.
contract ProofOfIndexing {
    struct Proof {
        uint256 fromBlock;
        uint256 toBlock;
        bytes32 proofHash;
        uint256 timestamp;
    }

    // operator => chainId => latest proof
    mapping(address => mapping(bytes32 => Proof)) private _latestProofs;

    event ProofSubmitted(
        address indexed operator,
        bytes32 indexed chainId,
        uint256 fromBlock,
        uint256 toBlock,
        bytes32 proofHash,
        uint256 timestamp
    );

    /// @notice Submit a PoI for a chain and block range.
    function submitProof(
        bytes32 chainId,
        uint256 fromBlock,
        uint256 toBlock,
        bytes32 proofHash
    ) external {
        require(chainId != bytes32(0), "ChainZero");
        require(proofHash != bytes32(0), "ProofZero");
        require(toBlock >= fromBlock, "InvalidRange");

        Proof memory proof = Proof({
            fromBlock: fromBlock,
            toBlock: toBlock,
            proofHash: proofHash,
            timestamp: block.timestamp
        });

        _latestProofs[msg.sender][chainId] = proof;

        emit ProofSubmitted(msg.sender, chainId, fromBlock, toBlock, proofHash, block.timestamp);
    }

    /// @notice Return the latest submitted proof for an operator + chain.
    function getLatestProof(address operator, bytes32 chainId) external view returns (Proof memory) {
        return _latestProofs[operator][chainId];
    }
}
