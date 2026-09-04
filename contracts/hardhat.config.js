require("@nomicfoundation/hardhat-toolbox");

/**
 * Environment variables (optional, only needed for live deployments):
 *   SEPOLIA_RPC_URL  - JSON-RPC endpoint for Sepolia
 *   PRIVATE_KEY      - deployer private key (never commit this)
 *   ETHERSCAN_API_KEY
 */
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "";
const ROBINHOOD_RPC_URL =
  process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
      viaIR: false,
    },
  },
  networks: {
    hardhat: {},
    localhost: { url: "http://127.0.0.1:8545" },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 11155111,
    },
    // Robinhood Chain — public EVM L2 (Arbitrum Orbit). Tokenized stock tokens
    // (TSLA, NVDA, …) and Uniswap V3/V4 live here, so this is the real target.
    robinhood: {
      url: ROBINHOOD_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId: 4663,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};
