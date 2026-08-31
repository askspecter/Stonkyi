"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat, mainnet } from "wagmi/chains";

/**
 * WalletConnect project id — grab one free at https://cloud.reown.com and set
 * NEXT_PUBLIC_WALLETCONNECT_ID. A dummy fallback keeps local dev booting.
 */
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "stonkinu-dev-placeholder";

export const wagmiConfig = getDefaultConfig({
  appName: "StonkInu",
  projectId,
  chains: [sepolia, hardhat, mainnet],
  ssr: true,
});
