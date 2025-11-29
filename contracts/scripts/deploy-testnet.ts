import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const coordinatorAddress = process.env.COORDINATOR_ADDRESS ?? deployer.address;

  console.log("Deploying with:", deployer.address);

  // -----------------------------
  // 1. TOKEN (already on Sepolia)
  // -----------------------------
  const rewardToken = "0x93b95F6956330f4a56E7A94457A7E597a7340E61";
  console.log("Using reward token:", rewardToken);

  // -----------------------------
  // 2. TREASURY DEPLOY
  // -----------------------------
  console.log("\nDeploying Treasury...");
  const Treasury = await ethers.getContractFactory("IndexFlowTreasury");
  const treasury = await Treasury.deploy(
    rewardToken,          // IERC20 tokenAddress
    deployer.address,     // daoMultisig (temporary: deployer)
    deployer.address      // strategist (temporary: deployer)
  );
  await treasury.waitForDeployment();
  const treasuryAddr = await treasury.getAddress();
  console.log("Treasury deployed at:", treasuryAddr);

  // -----------------------------
  // 3. LEGACY STAKING + REWARDS
  // -----------------------------
  console.log("\nDeploying IndexFlow Staking...");
  const Staking = await ethers.getContractFactory("IndexFlowStaking");
  const staking = await Staking.deploy(
    rewardToken,                   // IERC20 token
    deployer.address,              // admin
    ethers.parseUnits("1000", 18), // initialMinimumStake
    86400 * 7                      // initialLockPeriod = 7 days
  );
  await staking.waitForDeployment();
  const stakingAddr = await staking.getAddress();
  console.log("Staking deployed at:", stakingAddr);

  console.log("\nDeploying Rewards...");
  const Rewards = await ethers.getContractFactory("IndexFlowRewards");
  const rewards = await Rewards.deploy(
    rewardToken,                   // IERC20 _rewardToken
    stakingAddr,                   // IIndexFlowStaking _staking
    deployer.address,              // admin
    1000,                          // initialIndexerShareBps (10%)
    ethers.parseUnits("1000", 18), // initialMinimumIndexerStake
    10                             // initialConfirmationDepth (10 blocks)
  );
  await rewards.waitForDeployment();
  const rewardsAddr = await rewards.getAddress();
  console.log("Rewards deployed at:", rewardsAddr);

  // -----------------------------
  // 4. TOKEN UTILITY LAYER
  // -----------------------------
  console.log("\nDeploying Utility StakingPool...");
  const UtilityStaking = await ethers.getContractFactory("StakingPool");
  const utilityStaking = await UtilityStaking.deploy(rewardToken);
  await utilityStaking.waitForDeployment();
  const utilityStakingAddr = await utilityStaking.getAddress();
  console.log("Utility StakingPool deployed at:", utilityStakingAddr);

  console.log("\nDeploying ProofOfIndexing...");
  const ProofOfIndexing = await ethers.getContractFactory("ProofOfIndexing");
  const poi = await ProofOfIndexing.deploy();
  await poi.waitForDeployment();
  const poiAddr = await poi.getAddress();
  console.log("ProofOfIndexing deployed at:", poiAddr);

  console.log("\nDeploying ContributionRegistry...");
  const ContributionRegistry = await ethers.getContractFactory("ContributionRegistry");
  const contributionRegistry = await ContributionRegistry.deploy();
  await contributionRegistry.waitForDeployment();
  const contributionRegistryAddr = await contributionRegistry.getAddress();
  console.log("ContributionRegistry deployed at:", contributionRegistryAddr);

  // -----------------------------
  // 5. LINK + ROLES
  // -----------------------------
  console.log("\nLinking contracts...");

  const stakingCtr = await ethers.getContractAt("IndexFlowStaking", stakingAddr);
  const rewardsCtr = await ethers.getContractAt("IndexFlowRewards", rewardsAddr);
  const treasuryCtr = await ethers.getContractAt("IndexFlowTreasury", treasuryAddr);

  await (await treasuryCtr.setRewardsContract(rewardsAddr)).wait();
  await (await stakingCtr.grantRewardDistributor(rewardsAddr)).wait();

  const coordinatorRole = await rewardsCtr.COORDINATOR_ROLE();
  await (await rewardsCtr.grantRole(coordinatorRole, coordinatorAddress)).wait();
  console.log(`Coordinator role granted to ${coordinatorAddress}`);

  // -----------------------------
  // 6. SAVE DEPLOYMENT JSON
  // -----------------------------
  const output = {
    network: "sepolia",
    deployer: deployer.address,
    rewardToken,
    treasury: treasuryAddr,
    staking: stakingAddr,
    rewards: rewardsAddr,
    stakingPool: utilityStakingAddr,
    proofOfIndexing: poiAddr,
    contributionRegistry: contributionRegistryAddr,
    metadata: {
      coordinator: coordinatorAddress
    }
  };

  const filePath = path.join(__dirname, "../deployments/sepolia.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));

  console.log("\nDeployment written to:", filePath);
  console.log("\nDeployed addresses:");
  console.log(`  Treasury:              ${treasuryAddr}`);
  console.log(`  Staking:               ${stakingAddr}`);
  console.log(`  Rewards:               ${rewardsAddr}`);
  console.log(`  StakingPool (utility): ${utilityStakingAddr}`);
  console.log(`  ProofOfIndexing:       ${poiAddr}`);
  console.log(`  ContributionRegistry:  ${contributionRegistryAddr}`);
  console.log(`  Deployer:              ${deployer.address}`);
  console.log(`  Coordinator:           ${coordinatorAddress}`);
  console.log("\nDone: Full IndexFlow Testnet stack deployed!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
