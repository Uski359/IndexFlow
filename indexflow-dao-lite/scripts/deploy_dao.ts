import { ethers } from "hardhat";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", "infra", ".env") });

const DEFAULT_DELAY = 2 * 60 * 60; // 2 hours

async function main() {
  const [deployer] = await ethers.getSigners();

  const admin = process.env.DAO_ADMIN ?? deployer.address;
  const proposer = process.env.DAO_PROPOSER ?? deployer.address;
  const validator = process.env.DAO_VALIDATOR ?? deployer.address;
  const delay = DEFAULT_DELAY;

  console.log("Deploying contracts with:");
  console.log("  deployer", deployer.address);
  console.log("  admin   ", admin);
  console.log("  proposer", proposer);
  console.log("  validator", validator);

  const Executor = await ethers.getContractFactory("DAOExecutor");
  const executor = await Executor.deploy(admin, proposer, validator, delay);
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  console.log(`DAOExecutor deployed at ${executorAddress}`);

  const Governor = await ethers.getContractFactory("DAOGovernor");
  const governor = await Governor.deploy(admin, proposer, validator, executorAddress);
  await governor.waitForDeployment();
  const governorAddress = await governor.getAddress();
  console.log(`DAOGovernor deployed at ${governorAddress}`);

  if (admin.toLowerCase() === deployer.address.toLowerCase()) {
    const tx = await executor.updateProposer(governorAddress);
    await tx.wait();
    const govTx = await executor.setGovernor(governorAddress);
    await govTx.wait();
    console.log("DAOExecutor proposer role moved to DAOGovernor and governor hook set");
  } else {
    console.warn(
      "[warn] Admin is not the deployer. Call executor.updateProposer(governor) and executor.setGovernor(governor) from the admin account to finalize the wiring."
    );
  }

  const Treasury = await ethers.getContractFactory("TreasuryMock");
  const treasury = await Treasury.deploy(executorAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`TreasuryMock deployed at ${treasuryAddress}`);

  console.log("Deployment complete. Configure the treasury owner and role accounts before funding with testnet assets.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
