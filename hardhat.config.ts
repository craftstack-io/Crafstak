import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY?.trim();
if (deployerKey && !/^0x[0-9a-fA-F]{64}$/.test(deployerKey)) {
  throw new Error("DEPLOYER_PRIVATE_KEY harus berupa private key EVM hex 32-byte dengan awalan 0x.");
}

const accounts = deployerKey ? [deployerKey] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 300 }, viaIR: true },
  },
  networks: {
    bnbMainnet: {
      url: process.env.BNB_MAINNET_RPC_URL?.trim() || "https://bsc-dataseed.bnbchain.org",
      chainId: 56,
      accounts,
    },
  },
  paths: { sources: "./contracts", tests: "./test", cache: "./cache", artifacts: "./artifacts" },
};

export default config;
