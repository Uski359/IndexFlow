import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import { ethers } from "ethers";

type Artifact = {
  abi: any[];
  bytecode: string;
};

const ARTIFACT_ROOT = path.join(__dirname, "..", "artifacts", "contracts", "dao-lite");

async function loadArtifact(contractName: string): Promise<Artifact> {
  const artifactPath = path.join(ARTIFACT_ROOT, `${contractName}.sol`, `${contractName}.json`);
  try {
    const raw = await fs.readFile(artifactPath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Missing artifact for ${contractName}. Run "npm run compile:sol" before deploying. (looked in ${artifactPath})`
    );
  }
}

async function main() {
  const rpcUrl = process.env.RPC_URL ?? process.env.SEPOLIA_RPC_URL;
  const privateKey =
    process.env.PRIVATE_KEY ??
    process.env.PRIVATE_KEY_DUMMY ??
    "0x1000000000000000000000000000000000000000000000000000000000000001";

  if (!rpcUrl) {
    console.log(
      "[deploy] No RPC_URL found. Populate infra/.env.example into .env to enable Sepolia deployments."
    );
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log(`[deploy] Using deployer ${wallet.address}`);

  const executorArtifact = await loadArtifact("DAOExecutor");
  const governorArtifact = await loadArtifact("DAOGovernor");
  const treasuryArtifact = await loadArtifact("TreasuryMock");

  const executorFactory = new ethers.ContractFactory(
    executorArtifact.abi,
    executorArtifact.bytecode,
    wallet
  );

  // Timelock dry-run defaults: 2 minute delay, minimum 60 seconds.
  const executor = await executorFactory.deploy(wallet.address, 120, 60);
  await executor.waitForDeployment();
  console.log(`[deploy] DAOExecutor deployed at ${executor.target}`);

  const governorFactory = new ethers.ContractFactory(
    governorArtifact.abi,
    governorArtifact.bytecode,
    wallet
  );

  const governanceConfig = {
    votingDelay: 30,
    votingPeriod: 3 * 60,
    quorumNumerator: 10,
    quorumDenominator: 100
  };

  const governor = await governorFactory.deploy(
    executor.target,
    ethers.ZeroAddress,
    governanceConfig
  );
  await governor.waitForDeployment();
  console.log(`[deploy] DAOGovernor deployed at ${governor.target}`);

  const treasuryFactory = new ethers.ContractFactory(
    treasuryArtifact.abi,
    treasuryArtifact.bytecode,
    wallet
  );
  const treasury = await treasuryFactory.deploy();
  await treasury.waitForDeployment();
  console.log(`[deploy] TreasuryMock deployed at ${treasury.target}`);

  console.log("[deploy] Deployment complete. Remember: contracts are dry-run only.");
}

main().catch((error) => {
  console.error("[deploy] Failed:", error);
  process.exitCode = 1;
});
