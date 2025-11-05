import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const { RPC_URL_SEPOLIA, PRIVATE_KEY } = process.env;

const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : undefined;

if (!RPC_URL_SEPOLIA) {
  console.warn("[hardhat] RPC_URL_SEPOLIA is not set. Sepolia network configuration will be skipped.");
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
  networks: {
    hardhat: {},
    ...(RPC_URL_SEPOLIA
      ? {
          sepolia: {
            url: RPC_URL_SEPOLIA,
            accounts,
          },
        }
      : {}),
  },
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
