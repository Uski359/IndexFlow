import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const rootDir = process.cwd();
const deploymentsDir = join(rootDir, 'contracts', 'deployments');
const artifactsContractsDir = join(rootDir, 'contracts', 'artifacts', 'contracts');
const artifactsSrcDir = join(rootDir, 'contracts', 'artifacts', 'src');
const artifactsDir = existsSync(artifactsContractsDir) ? artifactsContractsDir : artifactsSrcDir;
const deploymentFile = join(deploymentsDir, 'latest.json');

function ensureFile(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    console.error(`Unable to read ${path}. Have you run the deploy script yet?`);
    process.exit(1);
  }
}

function updateAbi(sourceContract, artifactName, targetPath) {
  const artifactPath = join(artifactsDir, sourceContract, artifactName);
  const artifactRaw = ensureFile(artifactPath);
  const artifact = JSON.parse(artifactRaw);
  const abi = artifact.abi ?? artifact.default?.abi;
  if (!abi) {
    console.error(`ABI not found in artifact: ${artifactPath}`);
    process.exit(1);
  }

  const output = JSON.stringify({ abi }, null, 2);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, output);
  console.log(`Updated ABI: ${targetPath}`);
}

function updateEnvFile(filePath, updates) {
  let content = '';
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.warn(`Env file ${filePath} not found. Creating a new one.`);
  }

  const lines = content.split(/\r?\n/);
  const updatedKeys = new Set();

  const rewritten = lines.map((line) => {
    const index = line.indexOf('=');
    if (index === -1) return line;
    const key = line.slice(0, index);
    if (updates[key] !== undefined) {
      updatedKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key) && !rewritten.some((line) => line.startsWith(`${key}=`))) {
      rewritten.push(`${key}=${value}`);
    }
  }

  const normalized = rewritten.join('\n').replace(/\n{3,}/g, '\n\n');
  writeFileSync(filePath, normalized.trimEnd() + '\n');
  console.log(`Updated env: ${filePath}`);
}

function main() {
  const deploymentRaw = ensureFile(deploymentFile);
  const deployment = JSON.parse(deploymentRaw);

  console.log(`Syncing contracts for network: ${deployment.network}`);

  updateAbi('IndexFlowToken.sol', 'IndexFlowToken.json', join(rootDir, 'frontend', 'src', 'lib', 'ABI', 'IndexFlowT.json'));
  updateAbi('IndexFlowData.sol', 'IndexFlowData.json', join(rootDir, 'frontend', 'src', 'lib', 'ABI', 'IndexFlowData.json'));
  updateAbi('IndexFlowDAO.sol', 'IndexFlowDAO.json', join(rootDir, 'frontend', 'src', 'lib', 'ABI', 'IndexFlowDAO.json'));

  const envUpdates = {
    INDEXFLOW_TOKEN_ADDRESS: deployment.indexFlowToken,
    INDEXFLOW_DATA_ADDRESS: deployment.indexFlowData,
    INDEXFLOW_DAO_ADDRESS: deployment.indexFlowDao,
    STAKE_TOKEN_ADDRESS: deployment.indexFlowToken,
    STAKE_CONTRACT_ADDRESS: deployment.indexFlowToken
  };

  updateEnvFile(join(rootDir, 'backend', '.env'), envUpdates);
  updateEnvFile(join(rootDir, 'backend', '.env.example'), envUpdates);

  const frontendUpdates = {
    NEXT_PUBLIC_INDEXFLOW_TOKEN_ADDRESS: deployment.indexFlowToken,
    NEXT_PUBLIC_INDEXFLOW_DATA_ADDRESS: deployment.indexFlowData,
    NEXT_PUBLIC_INDEXFLOW_DAO_ADDRESS: deployment.indexFlowDao,
    NEXT_PUBLIC_STAKE_TOKEN_ADDRESS: deployment.indexFlowToken,
    NEXT_PUBLIC_STAKE_CONTRACT_ADDRESS: deployment.indexFlowToken
  };

  updateEnvFile(join(rootDir, 'frontend', '.env.local'), frontendUpdates);
  updateEnvFile(join(rootDir, 'frontend', '.env.example'), frontendUpdates);

  console.log('Contract sync completed.');
}

main();
