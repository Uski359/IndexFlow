import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { ethers, network } from "hardhat";

const REQUIRED_ENV_VARS = [
  "DAO_MULTISIG_ADDRESS",
  "COMMUNITY_VAULT_ADDRESS",
  "AIRDROP_VAULT_ADDRESS",
  "RESERVE_VAULT_ADDRESS",
  "FOUNDER_ADDRESS"
] as const;

type RequiredEnv = (typeof REQUIRED_ENV_VARS)[number];

function getEnv(name: RequiredEnv): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const daoMultisig = getEnv("DAO_MULTISIG_ADDRESS");
  const strategistAddress = process.env.STRATEGIST_ADDRESS ?? daoMultisig;
  const coordinatorAddress = process.env.COORDINATOR_ADDRESS ?? daoMultisig;

  const communityVault = getEnv("COMMUNITY_VAULT_ADDRESS");
  const airdropVault = getEnv("AIRDROP_VAULT_ADDRESS");
  const reserveVault = getEnv("RESERVE_VAULT_ADDRESS");
  const founder = getEnv("FOUNDER_ADDRESS");

  const minStake = ethers.parseEther(process.env.STAKING_MINIMUM ?? "1000");
  const lockPeriod = Number.parseInt(process.env.STAKE_LOCK_PERIOD_SECONDS ?? `${60 * 60 * 24 * 7}`, 10);
  const indexerShareBps = Number.parseInt(process.env.INDEXER_REWARD_SHARE_BPS ?? "7000", 10);
  const confirmationDepth = Number.parseInt(process.env.PROOF_CONFIRMATIONS ?? "12", 10);

  const now = Math.floor(Date.now() / 1000);
  const vestingStart = Number.parseInt(process.env.VESTING_START_TIMESTAMP ?? `${now + 3600}`, 10);
  const vestingCliff = Number.parseInt(process.env.VESTING_CLIFF_SECONDS ?? `${60 * 60 * 24 * 180}`, 10);

  const FoundersVesting = await ethers.getContractFactory("FoundersVesting");
  const foundersVesting = await FoundersVesting.deploy(founder, vestingStart, vestingCliff);
  await foundersVesting.waitForDeployment();
  console.log("FoundersVesting:", await foundersVesting.getAddress());

  const IndexFlowToken = await ethers.getContractFactory("IndexFlowToken");
  const token = await IndexFlowToken.deploy(
    {
      foundersVesting: await foundersVesting.getAddress(),
      daoTreasury: daoMultisig,
      communityAllocation: communityVault,
      airdropVault,
      ecosystemReserve: reserveVault
    },
    deployer.address
  );
  await token.waitForDeployment();
  console.log("IndexFlowToken:", await token.getAddress());

  const IndexFlowTreasury = await ethers.getContractFactory("IndexFlowTreasury");
  const treasury = await IndexFlowTreasury.deploy(await token.getAddress(), daoMultisig, strategistAddress);
  await treasury.waitForDeployment();
  console.log("IndexFlowTreasury:", await treasury.getAddress());

  const IndexFlowStaking = await ethers.getContractFactory("IndexFlowStaking");
  const staking = await IndexFlowStaking.deploy(
    await token.getAddress(),
    daoMultisig,
    minStake,
    lockPeriod
  );
  await staking.waitForDeployment();
  console.log("IndexFlowStaking:", await staking.getAddress());

  const IndexFlowRewards = await ethers.getContractFactory("IndexFlowRewards");
  const rewards = await IndexFlowRewards.deploy(
    await token.getAddress(),
    await staking.getAddress(),
    daoMultisig,
    indexerShareBps,
    minStake,
    confirmationDepth
  );
  await rewards.waitForDeployment();
  console.log("IndexFlowRewards:", await rewards.getAddress());

  const coordinatorRole = await rewards.COORDINATOR_ROLE();
  await (await rewards.grantRole(coordinatorRole, coordinatorAddress)).wait();
  await (await staking.grantRewardDistributor(await rewards.getAddress())).wait();
  await (await treasury.setRewardsContract(await rewards.getAddress())).wait();

  const deploymentsDir = join(__dirname, "..", "deployments");
  mkdirSync(deploymentsDir, { recursive: true });
  const output = {
    network: network.name,
    deployer: deployer.address,
    token: await token.getAddress(),
    treasury: await treasury.getAddress(),
    staking: await staking.getAddress(),
    rewards: await rewards.getAddress(),
    foundersVesting: await foundersVesting.getAddress(),
    parameters: {
      minStake: minStake.toString(),
      lockPeriod,
      indexerShareBps,
      confirmationDepth
    }
  };
  const filePath = join(deploymentsDir, `${network.name}-latest.json`);
  writeFileSync(filePath, JSON.stringify(output, null, 2));
  writeFileSync(join(deploymentsDir, "latest.json"), JSON.stringify(output, null, 2));
  console.log(`Deployment info written to ${filePath}`);

  const rootDir = join(__dirname, "..", "..");
  const syncScript = join(rootDir, "scripts", "sync-contracts.mjs");
  console.log("Syncing contract artifacts to other workspaces...");
  const syncResult = spawnSync("node", [syncScript], {
    cwd: rootDir,
    stdio: "inherit"
  });
  if (syncResult.status !== 0) {
    console.warn("Contract sync script exited with code", syncResult.status);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
