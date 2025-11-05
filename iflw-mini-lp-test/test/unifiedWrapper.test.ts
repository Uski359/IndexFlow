import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const WEEK = 7 * 24 * 60 * 60;

describe("IFLWUnifiedWrapper", () => {
  async function deployFixture() {
    const [deployer, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("IFLWTestToken");
    const stakingToken = await Token.deploy("IFLOWT", "IFLOWT");
    await stakingToken.waitForDeployment();
    const rewardToken = await Token.deploy("IFLWR", "IFLWR");
    await rewardToken.waitForDeployment();

    const Staking = await ethers.getContractFactory("IFLWStakingRewards");
    const staking = await Staking.deploy(await stakingToken.getAddress(), await rewardToken.getAddress(), WEEK);
    await staking.waitForDeployment();

    const Wrapper = await ethers.getContractFactory("IFLWUnifiedWrapper");
    const wrapper = await Wrapper.deploy(
      await stakingToken.getAddress(),
      await rewardToken.getAddress(),
      await staking.getAddress(),
      "IFLOW",
      "IFLOW"
    );
    await wrapper.waitForDeployment();

    await stakingToken.mint(user.address, ethers.parseUnits("1000"));
    await rewardToken.mint(deployer.address, ethers.parseUnits("500"));

    return { deployer, user, stakingToken, rewardToken, staking, wrapper };
  }

  it("wraps staking token and distributes rewards", async () => {
    const { deployer, user, stakingToken, rewardToken, staking, wrapper } = await deployFixture();

    await rewardToken.connect(deployer).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(deployer).notifyRewardAmount(ethers.parseUnits("100"));

    await stakingToken.connect(user).approve(await wrapper.getAddress(), ethers.MaxUint256);
    await wrapper.connect(user).deposit(ethers.parseUnits("100"));

    expect(await wrapper.balanceOf(user.address)).to.equal(ethers.parseUnits("100"));
    expect(await wrapper.totalUnderlying()).to.equal(ethers.parseUnits("100"));

    await time.increase(WEEK);
    await wrapper.connect(user).claim();

    const rewardBalance = await rewardToken.balanceOf(user.address);
    expect(rewardBalance > 0n).to.equal(true);

    await wrapper.connect(user).withdraw(ethers.parseUnits("50"));
    const shareBalance = await wrapper.balanceOf(user.address);
    expect(shareBalance).to.equal(ethers.parseUnits("50"));
    const stakingTokenBalance = await stakingToken.balanceOf(user.address);
    const expected = ethers.parseUnits("950");
    const delta = stakingTokenBalance > expected ? stakingTokenBalance - expected : expected - stakingTokenBalance;
    expect(delta <= ethers.parseUnits("0.0001")).to.equal(true);
  });

  it("exits and claims remaining rewards", async () => {
    const { deployer, user, stakingToken, rewardToken, staking, wrapper } = await deployFixture();

    await rewardToken.connect(deployer).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(deployer).notifyRewardAmount(ethers.parseUnits("50"));

    await stakingToken.connect(user).approve(await wrapper.getAddress(), ethers.MaxUint256);
    await wrapper.connect(user).deposit(ethers.parseUnits("40"));

    await time.increase(WEEK / 2);
    await wrapper.connect(user).exit();

    const stakeBalance = await wrapper.balanceOf(user.address);
    expect(stakeBalance).to.equal(0n);
    const tokenBalance = await stakingToken.balanceOf(user.address);
    const expected = ethers.parseUnits("1000");
    const delta = tokenBalance > expected ? tokenBalance - expected : expected - tokenBalance;
    expect(delta <= ethers.parseUnits("0.0001")).to.equal(true);
  });
});
