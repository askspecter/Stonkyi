"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat, mainnet } from "wagmi/chains";

/**
 * WalletConnect project id — grab one free at https://cloud.reown.com and set
 * NEXT_PUBLIC_WALLETCONNECT_ID for WalletConnect to work at runtime.
 *
 * RainbowKit throws at build time if the id is empty, which fails the whole
 * deploy. Use `||` + trim so an unset OR empty env var falls back to a
 * non-empty placeholder — the site always builds; other wallets still work.
 */
const projectId =
  (process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "").trim() ||
  "stonkinu_placeholder_projectid";

export const wagmiConfig = getDefaultConfig({
  appName: "StonkInu",
  projectId,
  chains: [sepolia, hardhat, mainnet],
  ssr: true,
});
