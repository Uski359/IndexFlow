import { expect } from "chai";
import { ethers } from "hardhat";

import type { Signer } from "ethers";
import type { IndexFlowDAO, IndexFlowData, IndexFlowToken } from "../typechain-types";

enum DatasetStatus {
  Pending,
  Indexed,
  Challenged,
  Rejected
}

describe("IndexFlow protocol integration", () => {
  let deployer: Signer;
  let contributor: Signer;
  let validator: Signer;
  let challenger: Signer;
  let secondaryValidator: Signer;
  let token: IndexFlowToken;
  let dataRegistry: IndexFlowData;
  let dao: IndexFlowDAO;

  const stakeDuration = 14 * 24 * 60 * 60;

  beforeEach(async () => {
    [deployer, contributor, validator, challenger, secondaryValidator] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("IndexFlowToken");
    token = (await tokenFactory.deploy(await deployer.getAddress())) as IndexFlowToken;

    const dataFactory = await ethers.getContractFactory("IndexFlowData");
    dataRegistry = (await dataFactory.deploy(
      await token.getAddress(),
      await deployer.getAddress(),
      await validator.getAddress()
    )) as IndexFlowData;

    const params = {
      baseReward: ethers.parseEther("100"),
      challengeBond: ethers.parseEther("200"),
      validatorQuorumBps: 6500,
      slashPenaltyBps: 1000
    };

    const daoFactory = await ethers.getContractFactory("IndexFlowDAO");
    dao = (await daoFactory.deploy(
      await token.getAddress(),
      await dataRegistry.getAddress(),
      params,
      "https://oracle.indexflow.network"
    )) as IndexFlowDAO;

    await dataRegistry.grantRole(await dataRegistry.DAO_ROLE(), await dao.getAddress());
    await dataRegistry.grantRole(await dataRegistry.VALIDATOR_ROLE(), await validator.getAddress());
    await dataRegistry.grantRole(
      await dataRegistry.DEFAULT_ADMIN_ROLE(),
      await dao.getAddress()
    );
    await token.transferOwnership(await dao.getAddress());

    await token.transfer(await contributor.getAddress(), ethers.parseEther("10000"));
    await token.transfer(await challenger.getAddress(), ethers.parseEther("5000"));
    await token.transfer(await dataRegistry.getAddress(), ethers.parseEther("50000"));
  });

  it("allows staking, preserves longer locks, and supports claiming rewards", async () => {
    const contributorAddress = await contributor.getAddress();
    const amount = ethers.parseEther("1000");
    await token.connect(contributor).approve(await token.getAddress(), amount * 2n);
    await token.connect(contributor).stake(amount, stakeDuration, 0);

    const firstStake = await token.stakes(contributorAddress);
    expect(firstStake.lockUntil).to.be.gt(0n);

    // Restake with shorter duration should preserve existing lock window.
    await token.connect(contributor).stake(amount, 7 * 24 * 60 * 60, 0);
    const secondStake = await token.stakes(contributorAddress);
    expect(secondStake.lockUntil).to.equal(firstStake.lockUntil);

    await ethers.provider.send("evm_increaseTime", [stakeDuration]);
    await ethers.provider.send("evm_mine", []);

    const pendingBefore = await token.pendingRewards(contributorAddress);
    expect(pendingBefore).to.be.gt(0n);

    const balanceBeforeClaim = await token.balanceOf(contributorAddress);
    await expect(token.connect(contributor).claimRewards()).to.emit(token, "RewardsClaimed");
    const balanceAfterClaim = await token.balanceOf(contributorAddress);
    expect(balanceAfterClaim).to.be.gt(balanceBeforeClaim);

    await ethers.provider.send("evm_increaseTime", [stakeDuration]);
    await ethers.provider.send("evm_mine", []);

    await token.connect(contributor).unstake(amount * 2n);
    const finalBalance = await token.balanceOf(contributorAddress);
    expect(finalBalance).to.be.gt(balanceAfterClaim);
  });

  it("enforces slashing limits and distributes penalties", async () => {
    const stakerAddress = await contributor.getAddress();
    const penaltyRecipient = await validator.getAddress();
    const amount = ethers.parseEther("2000");

    await token.connect(contributor).approve(await token.getAddress(), amount);
    await token.connect(contributor).stake(amount, stakeDuration, 1);

    const beforeStakeInfo = await token.stakes(stakerAddress);
    expect(beforeStakeInfo.mode).to.equal(1n);

    await expect(
      dao.connect(deployer).slashStake(stakerAddress, 1200, penaltyRecipient)
    ).to.be.revertedWith("penalty above limit");

    const expectedPenalty = (amount * 500n) / 10_000n;
    await expect(dao.connect(deployer).slashStake(stakerAddress, 500, penaltyRecipient)).to.emit(
      dao,
      "StakeSlashed"
    );

    const afterStakeInfo = await token.stakes(stakerAddress);
    expect(afterStakeInfo.amount).to.equal(beforeStakeInfo.amount - expectedPenalty);

    const recipientBalance = await token.balanceOf(penaltyRecipient);
    expect(recipientBalance).to.be.gte(expectedPenalty);
  });

  it("caps slashing to the staked balance and burns when recipient is zero", async () => {
    const staker = await contributor.getAddress();
    const amount = ethers.parseEther("750");

    await token.connect(contributor).approve(await token.getAddress(), amount);
    await token.connect(contributor).stake(amount, stakeDuration, 0);

    const params = await dao.parameters();
    await dao.connect(deployer).updateParameters({
      baseReward: params.baseReward,
      challengeBond: params.challengeBond,
      validatorQuorumBps: params.validatorQuorumBps,
      slashPenaltyBps: 10_000
    });

    const totalSupplyBefore = await token.totalSupply();
    const stakeBefore = await token.stakes(staker);
    expect(stakeBefore.amount).to.equal(amount);

    await expect(dao.connect(deployer).slashStake(staker, 10_000, ethers.ZeroAddress)).to.emit(
      dao,
      "StakeSlashed"
    );

    const stakeAfter = await token.stakes(staker);
    expect(stakeAfter.amount).to.equal(0n);

    const totalSupplyAfter = await token.totalSupply();
    expect(totalSupplyAfter).to.equal(totalSupplyBefore - amount);
  });

  it("restricts slashing to governor accounts", async () => {
    const staker = await contributor.getAddress();
    const amount = ethers.parseEther("600");

    await token.connect(contributor).approve(await token.getAddress(), amount);
    await token.connect(contributor).stake(amount, stakeDuration, 0);

    await expect(
      dao
        .connect(challenger)
        .slashStake(staker, 200, await validator.getAddress())
    ).to.be.revertedWithCustomError(dao, "AccessControlUnauthorizedAccount");
  });

  it("records dataset proofs and distributes rewards through the DAO", async () => {
    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-metadata",
      ethers.keccak256(ethers.toUtf8Bytes("content")),
      ethers.parseEther("500"),
      ethers.parseEther("300")
    );

    const datasetId = await dataRegistry.datasetCount();
    const poiHash = ethers.keccak256(ethers.randomBytes(32));
    const sqlHash = ethers.keccak256(ethers.randomBytes(32));

    await expect(
      dataRegistry.connect(validator).recordProof(datasetId, poiHash, sqlHash, 92)
    ).to.emit(dataRegistry, "ProofRecorded");

    await expect(
      dao
        .connect(deployer)
        .disburseReward(datasetId, await contributor.getAddress(), ethers.parseEther("250"))
    ).to.emit(dataRegistry, "RewardPaid");

    const dataset = await dataRegistry.datasetDetails(datasetId);
    expect(dataset.status).to.equal(DatasetStatus.Indexed);
  });

  it("handles challenge resolution paths and bond accounting", async () => {
    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-1",
      ethers.keccak256(ethers.toUtf8Bytes("dataset1")),
      ethers.parseEther("500"),
      ethers.parseEther("300")
    );
    const datasetId = await dataRegistry.datasetCount();

    await dataRegistry
      .connect(validator)
      .recordProof(
        datasetId,
        ethers.keccak256(ethers.randomBytes(32)),
        ethers.keccak256(ethers.randomBytes(32)),
        85
      );

    const bond = ethers.parseEther("250");
    await token.connect(challenger).approve(await dataRegistry.getAddress(), bond);
    await expect(
      dataRegistry
        .connect(challenger)
        .challengeDataset(datasetId, "Dataset includes inaccurate indexes", bond)
    )
      .to.emit(dataRegistry, "DatasetChallenged")
      .withArgs(datasetId, await challenger.getAddress(), "Dataset includes inaccurate indexes", bond);

    const penalty = ethers.parseEther("25");
    await expect(
      dao
        .connect(deployer)
        .resolveChallenge(datasetId, true, penalty, await challenger.getAddress())
    )
      .to.emit(dataRegistry, "PenaltyTransferred")
      .withArgs(datasetId, await challenger.getAddress(), penalty);

    const datasetAfter = await dataRegistry.datasetDetails(datasetId);
    expect(datasetAfter.status).to.equal(DatasetStatus.Rejected);

    const challengeData = await dataRegistry.challengeDetails(datasetId);
    expect(challengeData.resolved).to.be.true;
    expect(challengeData.upheld).to.be.true;
  });

  it("prevents concurrent challenges until the first is resolved", async () => {
    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-conflict",
      ethers.keccak256(ethers.toUtf8Bytes("conflict")),
      ethers.parseEther("500"),
      ethers.parseEther("300")
    );
    const datasetId = await dataRegistry.datasetCount();

    await dataRegistry
      .connect(validator)
      .recordProof(
        datasetId,
        ethers.keccak256(ethers.randomBytes(32)),
        ethers.keccak256(ethers.randomBytes(32)),
        82
      );

    const firstBond = ethers.parseEther("150");
    await token.connect(challenger).approve(await dataRegistry.getAddress(), firstBond);
    await dataRegistry
      .connect(challenger)
      .challengeDataset(datasetId, "Initial quality concern", firstBond);

    await token.transfer(await secondaryValidator.getAddress(), ethers.parseEther("300"));
    await token
      .connect(secondaryValidator)
      .approve(await dataRegistry.getAddress(), ethers.parseEther("120"));

    await expect(
      dataRegistry
        .connect(secondaryValidator)
        .challengeDataset(datasetId, "Second opinion", ethers.parseEther("120"))
    ).to.be.revertedWith("cannot challenge");
  });

  it("reinstates datasets when challenges fail and allows subsequent challenges", async () => {
    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-2",
      ethers.keccak256(ethers.toUtf8Bytes("dataset2")),
      ethers.parseEther("500"),
      ethers.parseEther("300")
    );
    const datasetId = await dataRegistry.datasetCount();

    await dataRegistry
      .connect(validator)
      .recordProof(
        datasetId,
        ethers.keccak256(ethers.randomBytes(32)),
        ethers.keccak256(ethers.randomBytes(32)),
        90
      );

    const challengerAddr = await challenger.getAddress();
    const bond = ethers.parseEther("200");
    await token.connect(challenger).approve(await dataRegistry.getAddress(), bond);
    await dataRegistry
      .connect(challenger)
      .challengeDataset(datasetId, "Proof quality is insufficient", bond);

    await expect(
      dao.connect(deployer).resolveChallenge(datasetId, false, 0, ethers.ZeroAddress)
    ).to.emit(dataRegistry, "ChallengeResolved");

    const datasetAfter = await dataRegistry.datasetDetails(datasetId);
    expect(datasetAfter.status).to.equal(DatasetStatus.Indexed);

    const challengeData = await dataRegistry.challengeDetails(datasetId);
    expect(challengeData.resolved).to.be.true;
    expect(challengeData.upheld).to.be.false;

    // Allow a new party to file a follow-up challenge after resolution.
    await token.transfer(await secondaryValidator.getAddress(), ethers.parseEther("500"));
    await token
      .connect(secondaryValidator)
      .approve(await dataRegistry.getAddress(), ethers.parseEther("150"));
    await expect(
      dataRegistry
        .connect(secondaryValidator)
        .challengeDataset(datasetId, "New evidence of mismatched hashes", ethers.parseEther("150"))
    ).to.emit(dataRegistry, "DatasetChallenged");
  });

  it("requires a recipient when disbursing challenge penalties", async () => {
    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-6",
      ethers.keccak256(ethers.toUtf8Bytes("dataset6")),
      ethers.parseEther("450"),
      ethers.parseEther("180")
    );
    const datasetId = await dataRegistry.datasetCount();

    await dataRegistry
      .connect(validator)
      .recordProof(
        datasetId,
        ethers.keccak256(ethers.randomBytes(32)),
        ethers.keccak256(ethers.randomBytes(32)),
        86
      );

    const bond = ethers.parseEther("120");
    await token.connect(challenger).approve(await dataRegistry.getAddress(), bond);
    await dataRegistry
      .connect(challenger)
      .challengeDataset(datasetId, "Validator double counted rows", bond);

    const penalty = ethers.parseEther("30");
    await expect(
      dao.connect(deployer).resolveChallenge(datasetId, true, penalty, ethers.ZeroAddress)
    ).to.be.revertedWith("recipient required");
  });

  it("enforces sufficient escrow before transferring challenge penalties", async () => {
    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-7",
      ethers.keccak256(ethers.toUtf8Bytes("dataset7")),
      ethers.parseEther("900"),
      ethers.parseEther("350")
    );
    const datasetId = await dataRegistry.datasetCount();

    await dataRegistry
      .connect(validator)
      .recordProof(
        datasetId,
        ethers.keccak256(ethers.randomBytes(32)),
        ethers.keccak256(ethers.randomBytes(32)),
        91
      );

    const bond = ethers.parseEther("150");
    await token.connect(challenger).approve(await dataRegistry.getAddress(), bond);
    await dataRegistry
      .connect(challenger)
      .challengeDataset(datasetId, "Dataset outputs diverge from oracle baseline", bond);

    const treasuryBalance = await token.balanceOf(await dataRegistry.getAddress());
    const excessivePenalty = treasuryBalance + 1n;
    await expect(
      dao
        .connect(deployer)
        .resolveChallenge(datasetId, true, excessivePenalty, await challenger.getAddress())
    ).to.be.revertedWith("insufficient slash balance");
  });

  it("supports multi-validator management via the DAO", async () => {
    const newValidator = await secondaryValidator.getAddress();
    await expect(dao.connect(deployer).registerValidator(newValidator))
      .to.emit(dao, "ValidatorRegistered")
      .withArgs(newValidator);

    await expect(dao.connect(deployer).registerValidator(newValidator)).to.be.revertedWith(
      "validator exists"
    );

    await dataRegistry.connect(contributor).submitDataset(
      "ipfs://dataset-3",
      ethers.keccak256(ethers.toUtf8Bytes("dataset3")),
      ethers.parseEther("500"),
      ethers.parseEther("300")
    );
    const datasetId = await dataRegistry.datasetCount();

    await expect(
      dataRegistry
        .connect(secondaryValidator)
        .recordProof(
          datasetId,
          ethers.keccak256(ethers.randomBytes(32)),
          ethers.keccak256(ethers.randomBytes(32)),
          88
        )
    ).to.emit(dataRegistry, "ProofRecorded");

    await expect(
      dao.connect(deployer).removeValidator(newValidator)
    ).to.emit(dao, "ValidatorRemoved");

    await expect(
      dataRegistry
        .connect(secondaryValidator)
        .recordProof(
          datasetId,
          ethers.keccak256(ethers.randomBytes(32)),
          ethers.keccak256(ethers.randomBytes(32)),
          90
        )
    ).to.be.revertedWithCustomError(dataRegistry, "AccessControlUnauthorizedAccount");
  });

  it("allows oracle managers to update the oracle endpoint", async () => {
    const newEndpoint = "https://oracle.alt.indexflow.network";

    await expect(dao.connect(deployer).setOracleEndpoint(newEndpoint))
      .to.emit(dao, "OracleEndpointUpdated")
      .withArgs(newEndpoint);

    expect(await dao.oracleEndpoint()).to.equal(newEndpoint);

    await expect(
      dao.connect(contributor).setOracleEndpoint("https://unauthorized.indexflow.network")
    ).to.be.revertedWithCustomError(dao, "AccessControlUnauthorizedAccount");
  });
});
