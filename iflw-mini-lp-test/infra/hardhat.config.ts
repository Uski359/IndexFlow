import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const { RPC_URL_SEPOLIA, RPC_URL_GOERLI, PRIVATE_KEY } = process.env;

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : undefined;

if (!RPC_URL_SEPOLIA && !RPC_URL_GOERLI) {
  console.warn("[hardhat] No RPC URL set. Configure RPC_URL_SEPOLIA or RPC_URL_GOERLI in your .env.");
}

const networks: HardhatUserConfig["networks"] = {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.g.alchemy.com/v2/vtMDks-q4F59s_mGE9HGg",
    },
  },
};

if (RPC_URL_SEPOLIA) {
  networks.sepolia = {
    url: RPC_URL_SEPOLIA,
    accounts,
  };
}

if (RPC_URL_GOERLI) {
  networks.goerli = {
    url: RPC_URL_GOERLI,
    accounts,
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks,
  paths: {
    root: "./",
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
