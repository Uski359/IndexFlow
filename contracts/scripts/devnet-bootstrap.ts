import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { ethers, network } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const DEFAULT_MNEMONIC = "test test test test test test test test test test test junk";

function buildPrivateKeyMap(mnemonic: string, count = 20) {
  const map = new Map<string, string>();
  const root = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m");
  for (let i = 0; i < count; i += 1) {
    const wallet = root.derivePath(`m/44'/60'/0'/0/${i}`);
    map.set(wallet.address.toLowerCase(), wallet.privateKey);
  }
  return map;
}

function resolveMnemonic(): string {
  const accountsConfig = network.config.accounts;
  if (typeof accountsConfig === "object" && accountsConfig && "mnemonic" in accountsConfig) {
    return accountsConfig.mnemonic ?? DEFAULT_MNEMONIC;
  }
  return DEFAULT_MNEMONIC;
}

const privateKeys = buildPrivateKeyMap(resolveMnemonic());

function getPrivateKey(address: string) {
  return privateKeys.get(address.toLowerCase()) ?? "";
}

async function main() {
  const [
    deployer,
    daoMultisig,
    strategist,
    communityVault,
    airdropVault,
    reserveVault,
    founder,
    coordinator,
    indexer,
    attestor
  ] = (await ethers.getSigners()) as HardhatEthersSigner[];

  console.log("Bootstrapping local devnet with deployer:", deployer.address);

  const minStake = ethers.parseEther("1000");
  const lockPeriod = 0;
  const indexerShareBps = 7_000;
  const confirmationDepth = 0;

  const now = await ethers.provider.getBlock("latest");
  const vestingStart = (now?.timestamp ?? Math.floor(Date.now() / 1000)) + 60;
  const vestingCliff = 60 * 60 * 24 * 30;

  const FoundersVesting = await ethers.getContractFactory("FoundersVesting");
  const foundersVesting = await FoundersVesting.deploy(founder.address, vestingStart, vestingCliff);
  await foundersVesting.waitForDeployment();

  const IndexFlowToken = await ethers.getContractFactory("IndexFlowToken");
  const token = await IndexFlowToken.deploy(
    {
      foundersVesting: await foundersVesting.getAddress(),
      daoTreasury: daoMultisig.address,
      communityAllocation: communityVault.address,
      airdropVault: airdropVault.address,
      ecosystemReserve: reserveVault.address
    },
    deployer.address
  );
  await token.waitForDeployment();

  const IndexFlowStaking = await ethers.getContractFactory("IndexFlowStaking");
  const staking = await IndexFlowStaking.deploy(
    await token.getAddress(),
    daoMultisig.address,
    minStake,
    lockPeriod
  );
  await staking.waitForDeployment();

  const IndexFlowRewards = await ethers.getContractFactory("IndexFlowRewards");
  const rewards = await IndexFlowRewards.deploy(
    await token.getAddress(),
    await staking.getAddress(),
    daoMultisig.address,
    indexerShareBps,
    minStake,
    confirmationDepth
  );
  await rewards.waitForDeployment();

  const coordinatorRole = await rewards.COORDINATOR_ROLE();
  await (await rewards.connect(daoMultisig).grantRole(coordinatorRole, coordinator.address)).wait();
  await (await staking.connect(daoMultisig).grantRewardDistributor(await rewards.getAddress())).wait();

  const stakeAmount = ethers.parseEther("5000");
  await token.connect(communityVault).transfer(indexer.address, stakeAmount);
  await token.connect(indexer).approve(await staking.getAddress(), stakeAmount);
  await staking.connect(indexer).stake(stakeAmount);

  const rewardFunding = ethers.parseEther("10000");
  await token.connect(daoMultisig).approve(await rewards.getAddress(), rewardFunding);
  await rewards.connect(daoMultisig).fundRewardPool(rewardFunding);

  console.log("Contracts deployed:");
  console.log("  Token:", await token.getAddress());
  console.log("  Staking:", await staking.getAddress());
  console.log("  Rewards:", await rewards.getAddress());
  console.log("Coordinator:", coordinator.address);
  console.log("Indexer:", indexer.address);
  console.log("Attestor:", attestor.address);

  const deploymentsDir = join(__dirname, "..", "deployments");
  mkdirSync(deploymentsDir, { recursive: true });

  const output = {
    network: "localhost",
    rpcUrl: "http://127.0.0.1:8545",
    chainId: "hardhat",
    coordinator: {
      address: coordinator.address,
    privateKey: getPrivateKey(coordinator.address)
  },
  indexer: {
    address: indexer.address,
    privateKey: getPrivateKey(indexer.address)
  },
  attestor: {
    address: attestor.address,
    privateKey: getPrivateKey(attestor.address)
  },
    contracts: {
      token: await token.getAddress(),
      staking: await staking.getAddress(),
      rewards: await rewards.getAddress()
    }
  };

  const filePath = join(deploymentsDir, "localhost-devnet.json");
  writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`Deployment summary saved to ${filePath}`);
  console.log("Use the printed private keys in index-node .env for coordinator bridge testing.");
}

main().catch((error) => {
  console.error("Devnet bootstrap failed", error);
  process.exitCode = 1;
});
