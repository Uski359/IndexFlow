import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const rootDir = path.resolve(__dirname, "..");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.23",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true
    }
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.TESTNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    holesky: {
      url: process.env.TESTNET_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  paths: {
    root: rootDir,
    sources: path.join(rootDir, "contracts"),
    tests: path.join(rootDir, "test"),
    cache: path.join(rootDir, "cache"),
    artifacts: path.join(rootDir, "artifacts"),
    scripts: path.join(rootDir, "scripts")
  },
  mocha: {
    timeout: 200000
  }
};

export default config;
