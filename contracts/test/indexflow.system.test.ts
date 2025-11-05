import { expect } from "chai";
import { ethers, network } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

const TOTAL_SUPPLY = ethers.parseEther("1000000000");
const FOUNDER_SHARE = TOTAL_SUPPLY * 15n / 100n;
const DAO_SHARE = TOTAL_SUPPLY * 35n / 100n;
const COMMUNITY_SHARE = TOTAL_SUPPLY * 25n / 100n;
const AIRDROP_SHARE = TOTAL_SUPPLY * 10n / 100n;
const RESERVE_SHARE = TOTAL_SUPPLY - FOUNDER_SHARE - DAO_SHARE - COMMUNITY_SHARE - AIRDROP_SHARE;

describe("IndexFlow protocol contracts", () => {
  async function deployContractsFixture() {
    const [
      deployer,
      daoMultisig,
      strategist,
      communityWallet,
      airdropWallet,
      reserveWallet,
      founder,
      indexer,
      coordinator,
      delegator
    ] = await ethers.getSigners();

    const now = await time.latest();
    const start = now + 60;
    const cliff = 60 * 60 * 24 * 180; // 6 months

    const FoundersVesting = await ethers.getContractFactory("FoundersVesting");
    const foundersVesting = await FoundersVesting.deploy(founder.address, start, cliff);

    const IndexFlowToken = await ethers.getContractFactory("IndexFlowToken");
    const token = await IndexFlowToken.deploy(
      {
        foundersVesting: await foundersVesting.getAddress(),
        daoTreasury: daoMultisig.address,
        communityAllocation: communityWallet.address,
        airdropVault: airdropWallet.address,
        ecosystemReserve: reserveWallet.address
      },
      deployer.address
    );

    const IndexFlowTreasury = await ethers.getContractFactory("IndexFlowTreasury");
    const treasury = await IndexFlowTreasury.deploy(
      await token.getAddress(),
      daoMultisig.address,
      strategist.address
    );

    const minStake = ethers.parseEther("1000");
    const lockPeriod = 60 * 60 * 24 * 7; // 7 days

    const IndexFlowStaking = await ethers.getContractFactory("IndexFlowStaking");
    const staking = await IndexFlowStaking.deploy(
      await token.getAddress(),
      daoMultisig.address,
      minStake,
      lockPeriod
    );

    const IndexFlowRewards = await ethers.getContractFactory("IndexFlowRewards");
    const confirmationDepth = 2;
    const indexerShareBps = 7000;
    const rewards = await IndexFlowRewards.deploy(
      await token.getAddress(),
      await staking.getAddress(),
      daoMultisig.address,
      indexerShareBps,
      minStake,
      confirmationDepth
    );

    const COORDINATOR_ROLE = await rewards.COORDINATOR_ROLE();
    await rewards.connect(daoMultisig).grantRole(COORDINATOR_ROLE, coordinator.address);

    await staking.connect(daoMultisig).grantRewardDistributor(await rewards.getAddress());

    return {
      deployer,
      daoMultisig,
      strategist,
      communityWallet,
      airdropWallet,
      reserveWallet,
      founder,
      indexer,
      coordinator,
      delegator,
      token,
      treasury,
      staking,
      rewards,
      foundersVesting,
      minStake,
      lockPeriod,
      confirmationDepth,
      indexerShareBps
    };
  }

  it("distributes genesis supply according to tokenomics", async () => {
    const {
      foundersVesting,
      daoMultisig,
      communityWallet,
      airdropWallet,
      reserveWallet,
      token
    } = await loadFixture(deployContractsFixture);

    expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
    expect(await token.balanceOf(await foundersVesting.getAddress())).to.equal(FOUNDER_SHARE);
    expect(await token.balanceOf(daoMultisig.address)).to.equal(DAO_SHARE);
    expect(await token.balanceOf(communityWallet.address)).to.equal(COMMUNITY_SHARE);
    expect(await token.balanceOf(airdropWallet.address)).to.equal(AIRDROP_SHARE);
    expect(await token.balanceOf(reserveWallet.address)).to.equal(RESERVE_SHARE);
  });

  it("releases founder tokens linearly after cliff", async () => {
    const { foundersVesting, token, founder } = await loadFixture(deployContractsFixture);

    const releasableBefore = await foundersVesting["releasable(address)"](await token.getAddress());
    expect(releasableBefore).to.equal(0n);
    await foundersVesting["release(address)"](await token.getAddress());
    expect(await token.balanceOf(founder.address)).to.equal(0n);

    const vestingStart = await foundersVesting.start();
    const vestingCliff = await foundersVesting.cliffDuration();
    const releaseTimestamp = Number(vestingStart + vestingCliff + 60n);
    await time.setNextBlockTimestamp(releaseTimestamp);
    await foundersVesting["release(address)"](await token.getAddress());

    const released = await token.balanceOf(founder.address);
    expect(released).to.be.gt(0n);
    expect(released).to.be.lt(FOUNDER_SHARE);
  });

  it("vests founder allocation evenly across twelve months", async () => {
    const { foundersVesting, token, founder } = await loadFixture(deployContractsFixture);

    const vestingStart = await foundersVesting.start();
    const vestingCliff = await foundersVesting.cliffDuration();
    const linearDuration = await foundersVesting.LINEAR_VESTING_PERIOD();

    const quarterlyTimestamp = Number(vestingStart + vestingCliff + (linearDuration / 12n) * 3n);
    await time.setNextBlockTimestamp(quarterlyTimestamp);
    await foundersVesting["release(address)"](await token.getAddress());

    const releasedQuarter = await token.balanceOf(founder.address);
    const expectedQuarter = (FOUNDER_SHARE * 3n) / 12n;
    const deltaQuarter = releasedQuarter > expectedQuarter
      ? releasedQuarter - expectedQuarter
      : expectedQuarter - releasedQuarter;
    expect(deltaQuarter).to.be.lte(FOUNDER_SHARE / 10_000n); // <=0.01% drift

    const finalTimestamp = Number(vestingStart + vestingCliff + linearDuration + 60n);
    await time.setNextBlockTimestamp(finalTimestamp);
    await foundersVesting["release(address)"](await token.getAddress());

    const finalBalance = await token.balanceOf(founder.address);
    expect(finalBalance).to.equal(FOUNDER_SHARE);
  });

  it("allows staking, reward distribution, and claiming via proof submission", async () => {
    const {
      communityWallet,
      indexer,
      delegator,
      token,
      staking,
      rewards,
      treasury,
      daoMultisig,
      coordinator,
      minStake,
      indexerShareBps,
      confirmationDepth
    } = await loadFixture(deployContractsFixture);

    const stakeAmountIndexer = ethers.parseEther("5000");
    const stakeAmountDelegator = ethers.parseEther("8000");
    await token.connect(communityWallet).transfer(indexer.address, stakeAmountIndexer);
    await token.connect(communityWallet).transfer(delegator.address, stakeAmountDelegator);

    await token.connect(indexer).approve(await staking.getAddress(), stakeAmountIndexer);
    await staking.connect(indexer).stake(stakeAmountIndexer);

    await token.connect(delegator).approve(await staking.getAddress(), stakeAmountDelegator);
    await staking.connect(delegator).stake(stakeAmountDelegator);

    expect(await staking.totalStaked()).to.equal(stakeAmountIndexer + stakeAmountDelegator);

    const rewardAmount = ethers.parseEther("10000");
    await token.connect(daoMultisig).approve(await rewards.getAddress(), rewardAmount);
    await rewards.connect(daoMultisig).fundRewardPool(rewardAmount);

    const currentBlock = await ethers.provider.getBlock("latest");
    const safeBlockNumber = currentBlock ? currentBlock.number - confirmationDepth - 1 : 0;

    const batchId = ethers.keccak256(ethers.toUtf8Bytes("batch-1"));

    await network.provider.send("evm_mine");
    await network.provider.send("evm_mine");

    const tx = await rewards.connect(coordinator).submitProof({
      batchId,
      indexer: indexer.address,
      poiMerkleRoot: ethers.keccak256(ethers.toUtf8Bytes("poi-root")),
      sqlProofRoot: ethers.keccak256(ethers.toUtf8Bytes("sql-root")),
      safeBlockNumber,
      rewardAmount
    });
    await expect(tx).to.emit(rewards, "Indexed");

    const indexerShare = rewardAmount * BigInt(indexerShareBps) / 10_000n;
    const delegatorShare = rewardAmount - indexerShare;

    expect(await token.balanceOf(indexer.address)).to.equal(indexerShare);

    const pendingIndexer = await staking.earned(indexer.address);
    const pendingDelegator = await staking.earned(delegator.address);
    const combinedPending = pendingIndexer + pendingDelegator;
    expect(combinedPending).to.be.lte(delegatorShare);
    expect(delegatorShare - combinedPending).to.be.lt(ethers.parseEther("0.000000000001"));

    const claimTx = await staking.connect(indexer).claimRewards();
    await expect(claimTx).to.emit(staking, "Claimed").withArgs(indexer.address, pendingIndexer);
  });

  it("rejects proof submissions for under-staked indexers", async () => {
    const {
      rewards,
      coordinator,
      communityWallet,
      indexer,
      staking,
      token,
      minStake,
      daoMultisig,
      indexerShareBps,
      confirmationDepth
    } =
      await loadFixture(deployContractsFixture);

    const increasedMinimum = minStake * 2n;
    await rewards
      .connect(daoMultisig)
      .setParameters(indexerShareBps, increasedMinimum, confirmationDepth);

    const insufficientStake = minStake / 2n;
    await token.connect(communityWallet).transfer(indexer.address, insufficientStake);

    await expect(
      rewards.connect(coordinator).submitProof({
        batchId: ethers.keccak256(ethers.toUtf8Bytes("batch-unstaked")),
        indexer: indexer.address,
        poiMerkleRoot: ethers.ZeroHash,
        sqlProofRoot: ethers.ZeroHash,
        safeBlockNumber: 0,
        rewardAmount: ethers.parseEther("1000")
      })
    ).to.be.revertedWith("IndexerStakeTooLow");
  });

  it("enforces safe block confirmations", async () => {
    const {
      rewards,
      coordinator,
      communityWallet,
      daoMultisig,
      token,
      staking,
      indexer,
      minStake
    } = await loadFixture(deployContractsFixture);

    await token.connect(communityWallet).transfer(indexer.address, minStake);
    await token.connect(indexer).approve(await staking.getAddress(), minStake);
    await staking.connect(indexer).stake(minStake);

    const rewardAmount = ethers.parseEther("5000");
    await token.connect(daoMultisig).approve(await rewards.getAddress(), rewardAmount);
    await rewards.connect(daoMultisig).fundRewardPool(rewardAmount);

    const latestBlock = await ethers.provider.getBlock("latest");
    const batchId = ethers.keccak256(ethers.toUtf8Bytes("batch-confirmations"));

  await expect(
      rewards.connect(coordinator).submitProof({
        batchId,
        indexer: indexer.address,
        poiMerkleRoot: ethers.ZeroHash,
        sqlProofRoot: ethers.ZeroHash,
        safeBlockNumber: latestBlock?.number ?? 0,
        rewardAmount
      })
    ).to.be.revertedWith("InsufficientConfirmations");
  });

  it("enforces treasury governance and reward funding controls", async () => {
    const {
      token,
      treasury,
      daoMultisig,
      strategist,
      communityWallet,
      rewards
    } = await loadFixture(deployContractsFixture);

    await expect(
      treasury.connect(communityWallet).setRewardsContract(await rewards.getAddress())
    )
      .to.be.revertedWithCustomError(treasury, "AccessControlUnauthorizedAccount")
      .withArgs(communityWallet.address, await treasury.EXECUTOR_ROLE());

    await expect(
      treasury.connect(daoMultisig).setRewardsContract(ethers.ZeroAddress)
    ).to.be.revertedWith("RewardsZero");

    await expect(
      treasury.connect(daoMultisig).setRewardsContract(await rewards.getAddress())
    ).to.emit(treasury, "RewardsContractUpdated");

    const depositAmount = ethers.parseEther("20000");
    await token.connect(daoMultisig).approve(await treasury.getAddress(), depositAmount);

    await treasury.connect(daoMultisig).pause();
    await expect(
      treasury.connect(daoMultisig).deposit(depositAmount)
    ).to.be.revertedWithCustomError(treasury, "EnforcedPause");

    await treasury.connect(daoMultisig).unpause();

    await expect(
      treasury.connect(daoMultisig).deposit(depositAmount)
    ).to.emit(treasury, "FundsDeposited").withArgs(daoMultisig.address, depositAmount);

    const withdrawAmount = ethers.parseEther("5000");
    await expect(
      treasury.connect(daoMultisig).withdraw(communityWallet.address, withdrawAmount, ethers.id("ops"))
    ).to.emit(treasury, "FundsWithdrawn").withArgs(
      daoMultisig.address,
      communityWallet.address,
      withdrawAmount,
      ethers.id("ops")
    );

    const fundAmount = ethers.parseEther("7000");
    await expect(
      treasury.connect(strategist).fundRewards(fundAmount)
    ).to.emit(treasury, "RewardsFunded").withArgs(strategist.address, fundAmount);

    expect(await token.balanceOf(await rewards.getAddress())).to.equal(fundAmount);
  });

  it("supports token governance controls", async () => {
    const {
      token,
      deployer,
      daoMultisig,
      communityWallet
    } = await loadFixture(deployContractsFixture);

    await expect(token.connect(communityWallet).pause())
      .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
      .withArgs(communityWallet.address, await token.PAUSER_ROLE());

    await token.connect(deployer).pause();
    const transferAmount = ethers.parseEther("1000");
    await expect(
      token.connect(communityWallet).transfer(daoMultisig.address, transferAmount)
    ).to.be.revertedWithCustomError(token, "EnforcedPause");

    await token.connect(deployer).unpause();

    const mintAmount = ethers.parseEther("10000");
    await token.connect(deployer).mint(deployer.address, mintAmount);

    const transferPortion = mintAmount / 2n;
    const initialCommunityBalance = await token.balanceOf(communityWallet.address);
    await token.connect(deployer).transfer(communityWallet.address, transferPortion);

    const burnAmount = transferPortion / 2n;
    await token.connect(communityWallet).burn(burnAmount);

    await token.connect(communityWallet).approve(deployer.address, burnAmount);
    await token.connect(deployer).burnFrom(communityWallet.address, burnAmount);

    const finalCommunityBalance = await token.balanceOf(communityWallet.address);
    expect(finalCommunityBalance).to.equal(initialCommunityBalance + transferPortion - burnAmount * 2n);

    await expect(
      token.connect(communityWallet).mint(communityWallet.address, 1n)
    )
      .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
      .withArgs(communityWallet.address, await token.MINTER_ROLE());
  });

  it("queues rewards when unstaked and applies staking governance controls", async () => {
    const {
      staking,
      token,
      daoMultisig,
      communityWallet,
      indexer,
      rewards
    } = await loadFixture(deployContractsFixture);

    await staking.connect(daoMultisig).setMinimumStake(0);
    await staking.connect(daoMultisig).setLockPeriod(0);

    await staking.connect(daoMultisig).grantRewardDistributor(daoMultisig.address);
    const queuedReward = ethers.parseEther("4000");
    await token.connect(daoMultisig).approve(await staking.getAddress(), queuedReward);
    await expect(
      staking.connect(daoMultisig).notifyReward(queuedReward, ethers.id("queued"))
    ).to.emit(staking, "RewardQueued").withArgs(ethers.id("queued"), queuedReward);
    expect(await staking.pendingRewards()).to.equal(queuedReward);

    await staking.connect(daoMultisig).pause();
    const stakeAmount = ethers.parseEther("6000");
    await token.connect(communityWallet).transfer(indexer.address, stakeAmount);
    await token.connect(indexer).approve(await staking.getAddress(), stakeAmount);
    await expect(staking.connect(indexer).stake(stakeAmount)).to.be.revertedWithCustomError(staking, "EnforcedPause");

    await staking.connect(daoMultisig).unpause();

    await staking.connect(indexer).stake(stakeAmount);
    expect(await staking.pendingRewards()).to.equal(queuedReward);

    const earned = await staking.earned(indexer.address);
    expect(earned).to.be.gt(0n);

    await expect(staking.connect(indexer).claimRewards())
      .to.emit(staking, "Claimed")
      .withArgs(indexer.address, earned);

    expect(await staking.pendingRewards()).to.equal(0n);

    await staking.connect(daoMultisig).revokeRewardDistributor(await rewards.getAddress());
  });

  it("allows rewards admin to manage configuration and pausing", async () => {
    const {
      rewards,
      staking,
      daoMultisig,
      coordinator,
      token
    } = await loadFixture(deployContractsFixture);

    await expect(rewards.connect(coordinator).pause())
      .to.be.revertedWithCustomError(rewards, "AccessControlUnauthorizedAccount")
      .withArgs(coordinator.address, await rewards.DEFAULT_ADMIN_ROLE());

    await rewards.connect(daoMultisig).pause();

    const fundingAmount = ethers.parseEther("2500");
    await token.connect(daoMultisig).approve(await rewards.getAddress(), fundingAmount);
    await expect(rewards.connect(daoMultisig).fundRewardPool(fundingAmount)).to.be.revertedWithCustomError(
      rewards,
      "EnforcedPause"
    );

    await rewards.connect(daoMultisig).unpause();

    const newShare = 6500;
    const newMinimum = ethers.parseEther("1500");
    const newConfirmations = 5;
    await expect(
      rewards.connect(daoMultisig).setParameters(newShare, newMinimum, newConfirmations)
    ).to.emit(rewards, "ParametersUpdated").withArgs(newShare, newMinimum, newConfirmations);

    expect(await rewards.indexerShareBps()).to.equal(newShare);
    expect(await rewards.minimumIndexerStake()).to.equal(newMinimum);
    expect(await rewards.confirmationDepth()).to.equal(newConfirmations);

    await expect(
      rewards.connect(daoMultisig).setParameters(20_000, newMinimum, newConfirmations)
    ).to.be.revertedWith("ShareTooHigh");

    await expect(
      rewards.connect(daoMultisig).setStaking(ethers.ZeroAddress as unknown as any)
    ).to.be.revertedWith("StakingZero");

    await expect(
      rewards.connect(daoMultisig).setStaking(staking)
    ).to.emit(rewards, "StakingContractUpdated").withArgs(await staking.getAddress());
  });
});
