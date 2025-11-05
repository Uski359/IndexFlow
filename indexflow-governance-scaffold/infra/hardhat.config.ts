import path from "path";
import { HardhatUserConfig, NetworksUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const RPC_URL = process.env.RPC_URL ?? process.env.SEPOLIA_RPC_URL ?? "";
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ??
  process.env.PRIVATE_KEY_DUMMY ??
  "0x1000000000000000000000000000000000000000000000000000000000000001";

const networks: NetworksUserConfig = {
  hardhat: {
    chainId: 31337
  }
};

if (RPC_URL) {
  networks.sepolia = {
    url: RPC_URL,
    accounts: [PRIVATE_KEY]
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "hardhat",
  paths: {
    sources: path.join(__dirname, "..", "contracts"),
    tests: path.join(__dirname, "..", "test"),
    cache: path.join(__dirname, "..", "cache"),
    artifacts: path.join(__dirname, "..", "artifacts")
  },
  networks,
  etherscan: {
    apiKey: process.env.ETHERSCAN_API ?? "dummy"
  }
};

export default config;
