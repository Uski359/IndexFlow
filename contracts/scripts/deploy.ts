import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const tokenFactory = await ethers.getContractFactory("IndexFlowToken");
  const token = await tokenFactory.deploy(deployer.address);
  await token.waitForDeployment();
  console.log("IndexFlowToken:", await token.getAddress());

  const dataFactory = await ethers.getContractFactory("IndexFlowData");
  const dataRegistry = await dataFactory.deploy(
    await token.getAddress(),
    await deployer.getAddress(),
    await deployer.getAddress()
  );
  await dataRegistry.waitForDeployment();
  console.log("IndexFlowData:", await dataRegistry.getAddress());

  const params = {
    baseReward: ethers.parseEther("100"),
    challengeBond: ethers.parseEther("200"),
    validatorQuorumBps: 6500,
    slashPenaltyBps: 1000
  };

  const daoFactory = await ethers.getContractFactory("IndexFlowDAO");
  const dao = await daoFactory.deploy(
    await token.getAddress(),
    await dataRegistry.getAddress(),
    params,
    "https://oracle.indexflow.network"
  );
  await dao.waitForDeployment();
  console.log("IndexFlowDAO:", await dao.getAddress());

  await (await dataRegistry.grantRole(await dataRegistry.DAO_ROLE(), await dao.getAddress())).wait();
  console.log("DAO granted control of data registry.");

  const deploymentsDir = join(__dirname, "..", "deployments");
  mkdirSync(deploymentsDir, { recursive: true });
  const output = {
    network: network.name,
    deployer: await deployer.getAddress(),
    indexFlowToken: await token.getAddress(),
    indexFlowData: await dataRegistry.getAddress(),
    indexFlowDao: await dao.getAddress()
  };
  const filePath = join(deploymentsDir, `${network.name}-latest.json`);
  writeFileSync(filePath, JSON.stringify(output, null, 2));
  writeFileSync(join(deploymentsDir, "latest.json"), JSON.stringify(output, null, 2));
  console.log(`Deployment info written to ${filePath}`);

  const rootDir = join(__dirname, "..", "..");
  const syncScript = join(rootDir, "scripts", "sync-contracts.mjs");
  console.log("Syncing contract artifacts and environment files...");
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
