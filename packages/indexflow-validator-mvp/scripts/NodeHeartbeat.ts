import { Contract, JsonRpcProvider, Wallet, ethers } from "ethers";
import * as dotenv from "dotenv";

import stakingArtifact from "../artifacts/contracts/StakingRewards.sol/StakingRewards.json";
import registryArtifact from "../artifacts/contracts/ValidatorRegistry.sol/ValidatorRegistry.json";

dotenv.config();

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const VALIDATOR_KEY = process.env.VALIDATOR_KEY;
const STAKING_REWARDS_ADDRESS = process.env.STAKING_REWARDS_ADDRESS;
const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS;
const MIN_STAKE = process.env.MIN_STAKE ?? "0.5"; // ether
const HEARTBEAT_INTERVAL_MS = Number(process.env.HEARTBEAT_INTERVAL_MS ?? 5000);

if (!VALIDATOR_KEY || !STAKING_REWARDS_ADDRESS || !REGISTRY_ADDRESS) {
  throw new Error("Missing RPC/contract configuration. Set VALIDATOR_KEY, STAKING_REWARDS_ADDRESS and REGISTRY_ADDRESS in .env");
}

const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(VALIDATOR_KEY, provider);
const staking = new Contract(STAKING_REWARDS_ADDRESS, stakingArtifact.abi, wallet);
const registry = new Contract(REGISTRY_ADDRESS, registryArtifact.abi, wallet);

async function ensureValidatorReady() {
  const validator = await registry.getValidator(wallet.address);
  if (!validator.active) {
    const tx = await registry.register();
    await tx.wait();
    console.log(`Registered validator ${wallet.address}`);
  }

  const currentStake: bigint = await staking.stakes(wallet.address);
  const minStakeWei = ethers.parseEther(MIN_STAKE);

  if (currentStake < minStakeWei) {
    const topUp = minStakeWei - currentStake;
    const tx = await staking.deposit({ value: topUp });
    await tx.wait();
    console.log(`Deposited ${ethers.formatEther(topUp)} ETH to reach target stake`);
  }
}

async function submitHeartbeat() {
  const proofHash = ethers.hexlify(ethers.randomBytes(32));
  try {
    const tx = await staking.submitProof(proofHash);
    const receipt = await tx.wait();
    console.log(`Submitted proof ${proofHash} in tx ${receipt?.hash}`);
  } catch (error) {
    console.error(`Proof submission failed: ${(error as Error).message}`);
  }
}

async function main() {
  console.log(`Starting heartbeat for validator ${wallet.address}`);
  await ensureValidatorReady();

  await submitHeartbeat();
  setInterval(async () => {
    await ensureValidatorReady();
    await submitHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
