import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const DEFAULT_RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const DEPLOYER_KEY = process.env.DEPLOYER_KEY ?? process.env.VALIDATOR_KEY ?? "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      url: DEFAULT_RPC_URL,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : undefined,
    },
  },
};

export default config;
