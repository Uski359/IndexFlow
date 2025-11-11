import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { cwd } from "process";
import { ethers } from "ethers";

dotenvConfig({ path: resolve(cwd(), ".env") });

type OptionalEnv = string | undefined | null;

export const REQUIRED_ENV_VARS = [
  "PRIVATE_KEY",
  "UNIV3_FACTORY",
  "UNIV3_POSITION_MANAGER",
  "UNIV3_SWAP_ROUTER",
  "UNIV3_QUOTER_V2",
  "WETH",
  "FEE_TIER",
  "P0_NUMERATOR",
  "P0_DENOMINATOR",
  "DECIMALS"
] as const;

export const OPTIONAL_ENV_VARS = [
  "RPC_URL_SEPOLIA",
  "RPC_URL_GOERLI",
  "IFLW_TOKEN",
  "USDC",
  "STAKING_TOKEN",
  "REWARD_TOKEN",
  "STAKING_REWARDS",
  "UNIFIED_WRAPPER"
] as const;

export function getEnvVar(name: string, required = true): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    if (required) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return "";
  }
  return value.trim();
}

export function getOptionalAddress(name: string, value: OptionalEnv): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} is not a valid address: ${value}`);
  }
  return value;
}

export function getAddress(name: string): string {
  const value = getEnvVar(name, true);
  if (!ethers.isAddress(value)) {
    throw new Error(`${name} is not a valid address: ${value}`);
  }
  return value;
}

export function getRpcUrl(): string {
  const primary = process.env.RPC_URL_SEPOLIA?.trim();
  const secondary = process.env.RPC_URL_GOERLI?.trim();
  if (primary) {
    return primary;
  }
  if (secondary) {
    return secondary;
  }
  throw new Error("Missing RPC URL. Set RPC_URL_SEPOLIA or RPC_URL_GOERLI in .env");
}

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(getRpcUrl());
}

export function getWallet(provider?: ethers.JsonRpcProvider): ethers.Wallet {
  const pk = getEnvVar("PRIVATE_KEY");
  return new ethers.Wallet(pk, provider ?? getProvider());
}

export function getFeeTier(): number {
  const fee = Number(getEnvVar("FEE_TIER"));
  if (![100, 500, 3000, 10000].includes(fee)) {
    throw new Error(`Unsupported FEE_TIER ${fee}. Supported tiers: 100, 500, 3000, 10000.`);
  }
  return fee;
}

export function getDecimals(): number {
  const decimals = Number(getEnvVar("DECIMALS"));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error(`DECIMALS must be an integer between 0 and 36. Got ${decimals}.`);
  }
  return decimals;
}

export interface UniswapContracts {
  factory: string;
  positionManager: string;
  router: string;
  quoter: string;
  weth: string;
  usdc?: string;
  iflwToken?: string;
  stakingToken?: string;
  rewardToken?: string;
  stakingRewards?: string;
  unifiedWrapper?: string;
}

export function getUniswapContracts(): UniswapContracts {
  return {
    factory: getAddress("UNIV3_FACTORY"),
    positionManager: getAddress("UNIV3_POSITION_MANAGER"),
    router: getAddress("UNIV3_SWAP_ROUTER"),
    quoter: getAddress("UNIV3_QUOTER_V2"),
    weth: getAddress("WETH"),
    usdc: getOptionalAddress("USDC", process.env.USDC),
    iflwToken: getOptionalAddress("IFLW_TOKEN", process.env.IFLW_TOKEN),
    stakingToken: getOptionalAddress("STAKING_TOKEN", process.env.STAKING_TOKEN),
    rewardToken: getOptionalAddress("REWARD_TOKEN", process.env.REWARD_TOKEN),
    stakingRewards: getOptionalAddress("STAKING_REWARDS", process.env.STAKING_REWARDS),
    unifiedWrapper: getOptionalAddress("UNIFIED_WRAPPER", process.env.UNIFIED_WRAPPER),
  };
}

export function getPriceRatio(): { numerator: bigint; denominator: bigint } {
  const numerator = BigInt(getEnvVar("P0_NUMERATOR"));
  const denominator = BigInt(getEnvVar("P0_DENOMINATOR"));
  if (denominator === 0n) {
    throw new Error("P0_DENOMINATOR cannot be zero.");
  }
  return { numerator, denominator };
}
