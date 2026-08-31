"use client";

import { useChainId } from "wagmi";
import { abis, getDeployment, ACTIVE_CHAIN_ID, type Deployment } from "@/config/contracts";

/**
 * Resolves the deployment for the currently connected chain, falling back to
 * the UI's default chain. Returns null when nothing is deployed there yet.
 */
export function useDeployment(): { chainId: number; deployment: Deployment | null } {
  const connected = useChainId();
  const chainId = getDeployment(connected) ? connected : ACTIVE_CHAIN_ID;
  return { chainId, deployment: getDeployment(chainId) };
}

export { abis };
