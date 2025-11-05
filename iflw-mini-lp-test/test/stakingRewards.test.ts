import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const WEEK = 7 * 24 * 60 * 60;

describe("IFLWStakingRewards", () => {
  async function deployFixture() {
    const [deployer, user] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("IFLWTestToken");
    const stakingToken = await Token.deploy("Stake Token", "IFLOWT");
    await stakingToken.waitForDeployment();
    const rewardToken = await Token.deploy("Reward Token", "IFLWR");
    await rewardToken.waitForDeployment();

    const Staking = await ethers.getContractFactory("IFLWStakingRewards");
    const staking = await Staking.deploy(await stakingToken.getAddress(), await rewardToken.getAddress(), WEEK);
    await staking.waitForDeployment();

    await stakingToken.mint(user.address, ethers.parseUnits("1000"));
    await rewardToken.mint(deployer.address, ethers.parseUnits("500"));

    return { stakingToken, rewardToken, staking, deployer, user };
  }

  it("distributes rewards over time", async () => {
    const { stakingToken, rewardToken, staking, deployer, user } = await deployFixture();

    await rewardToken.connect(deployer).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(deployer).notifyRewardAmount(ethers.parseUnits("100"));

    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(user).stake(ethers.parseUnits("100"));

    await time.increase(WEEK / 2);
    const earnedHalf = await staking.earned(user.address);
    expect(earnedHalf > 0n).to.equal(true);

    await time.increase(WEEK);
    const earnedFull = await staking.earned(user.address);
    const target = ethers.parseUnits("100");
    const tolerance = ethers.parseUnits("0.01");
    const withinTolerance = earnedFull >= target - tolerance && earnedFull <= target + tolerance;
    expect(withinTolerance).to.equal(true);

    await staking.connect(user).getReward();
    const balance = await rewardToken.balanceOf(user.address);
    const balanceWithinTolerance = balance >= target - tolerance && balance <= target + tolerance;
    expect(balanceWithinTolerance).to.equal(true);
  });

  it("allows stake, withdraw, exit", async () => {
    const { stakingToken, rewardToken, staking, deployer, user } = await deployFixture();
    await rewardToken.connect(deployer).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(deployer).notifyRewardAmount(ethers.parseUnits("50"));

    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.MaxUint256);
    await staking.connect(user).stake(ethers.parseUnits("20"));
    await time.increase(WEEK / 4);

    await staking.connect(user).withdraw(ethers.parseUnits("5"));
    const staked = await staking.balances(user.address);
    expect(staked).to.equal(ethers.parseUnits("15"));

    await staking.connect(user).exit();
    const remaining = await staking.balances(user.address);
    expect(remaining).to.equal(0n);
  });
});
