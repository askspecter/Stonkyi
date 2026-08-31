import type { Abi } from "viem";
import brokerAbi from "@/abi/StonkInuBroker.json";
import stonkInuAbi from "@/abi/StonkInu.json";
import stockAbi from "@/abi/StockToken.json";
import accountAbi from "@/abi/ERC6551Account.json";

import sepolia from "@/config/deployments/11155111.json";
import hardhat from "@/config/deployments/31337.json";

export type Deployment = {
  chainId: number;
  StonkInu: `0x${string}`;
  StockToken: `0x${string}`;
  MockStockBuyer: `0x${string}`;
  ERC6551Registry: `0x${string}`;
  ERC6551Account: `0x${string}`;
  StonkInuBroker: `0x${string}`;
  treasury: `0x${string}`;
};

const deployments: Record<number, Deployment> = {
  11155111: sepolia as Deployment,
  31337: hardhat as Deployment,
};

export const abis = {
  broker: brokerAbi as Abi,
  stonkInu: stonkInuAbi as Abi,
  stock: stockAbi as Abi,
  account: accountAbi as Abi,
};

/** The chain the UI targets; override with NEXT_PUBLIC_CHAIN_ID. */
export const ACTIVE_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111"
);

const ZERO = "0x0000000000000000000000000000000000000000";

export function getDeployment(chainId: number = ACTIVE_CHAIN_ID): Deployment | null {
  const d = deployments[chainId];
  if (!d || d.StonkInuBroker === ZERO) return null;
  return d;
}

/** Protocol constants (mirror the on-chain constants in StonkInuBroker). */
export const PROTOCOL = {
  maxSupply: 999n,
  burnAmount: 50_000n * 10n ** 18n, // 50,000 $STONKINU
  mintPrice: 2_000_000_000_000_000n, // 0.002 ETH
  stockShare: 1_000_000_000_000_000n, // 0.001 ETH -> buy stock for holders
  protocolShare: 1_000_000_000_000_000n, // 0.001 ETH -> protocol treasury
} as const;
