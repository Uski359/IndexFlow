import '@nomicfoundation/hardhat-toolbox';
import '@typechain/hardhat';
import { HardhatUserConfig } from 'hardhat/config';
import dotenv from 'dotenv';

dotenv.config();

const privateKey = process.env.DEPLOYER_KEY;
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;

const networks: HardhatUserConfig['networks'] = {
  hardhat: {
    chainId: 31337
  }
};

if (privateKey && sepoliaRpcUrl) {
  networks.sepolia = {
    url: sepoliaRpcUrl,
    accounts: [privateKey]
  };
}

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.23',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks,
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY ?? ''
  },
  paths: {
    sources: './src',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6'
  }
};

export default config;
