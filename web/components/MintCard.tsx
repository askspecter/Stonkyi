"use client";

import { useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { maxUint256 } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { abis, useDeployment } from "@/lib/useBroker";
import { PROTOCOL } from "@/config/contracts";
import { fmtUnits } from "@/lib/format";

export function MintCard() {
  const { address, isConnected } = useAccount();
  const { deployment } = useDeployment();
  const broker = deployment?.StonkInuBroker;
  const stonkInu = deployment?.StonkInu;

  const balanceQ = useReadContract({
    address: stonkInu,
    abi: abis.stonkInu,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!stonkInu && !!address },
  });

  const allowanceQ = useReadContract({
    address: stonkInu,
    abi: abis.stonkInu,
    functionName: "allowance",
    args: address && broker ? [address, broker] : undefined,
    query: { enabled: !!stonkInu && !!address && !!broker },
  });

  const supplyQ = useReadContract({
    address: broker,
    abi: abis.broker,
    functionName: "totalSupply",
    query: { enabled: !!broker, refetchInterval: 8000 },
  });

  const { data: hash, writeContract, isPending, reset, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Refetch balances/allowance once a tx confirms.
  useEffect(() => {
    if (isSuccess) {
      balanceQ.refetch();
      allowanceQ.refetch();
      supplyQ.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const balance = (balanceQ.data as bigint) ?? 0n;
  const allowance = (allowanceQ.data as bigint) ?? 0n;
  const minted = (supplyQ.data as bigint) ?? 0n;

  const soldOut = minted >= PROTOCOL.maxSupply;
  const hasEnough = balance >= PROTOCOL.burnAmount;
  const needsApproval = allowance < PROTOCOL.burnAmount;
  const busy = isPending || isMining;

  function approve() {
    if (!stonkInu || !broker) return;
    reset();
    writeContract({
      address: stonkInu,
      abi: abis.stonkInu,
      functionName: "approve",
      args: [broker, maxUint256],
    });
  }

  function mint() {
    if (!broker) return;
    reset();
    writeContract({
      address: broker,
      abi: abis.broker,
      functionName: "mint",
      value: PROTOCOL.mintPrice,
    });
  }

  return (
    <div className="panel rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight acid-text">Hire a broker</h2>
        <span className="rounded-full border border-line px-3 py-1 text-[11px] uppercase tracking-widest text-acidDim">
          {minted.toString()} / {PROTOCOL.maxSupply.toString()}
        </span>
      </div>

      <dl className="mt-5 space-y-2 text-sm">
        <Row label="Burn cost">
          {fmtUnits(PROTOCOL.burnAmount)} <span className="text-acidDim">$STONKINU</span>
        </Row>
        <Row label="Mint fee">
          {fmtUnits(PROTOCOL.mintPrice)} <span className="text-acidDim">ETH</span>
        </Row>
        <Row label="→ Buy stock for holders">
          {fmtUnits(PROTOCOL.stockShare)} <span className="text-acidDim">ETH</span>
        </Row>
        <Row label="→ Protocol treasury">
          {fmtUnits(PROTOCOL.protocolShare)} <span className="text-acidDim">ETH</span>
        </Row>
      </dl>

      <div className="my-5 h-px w-full bg-line" />

      {!deployment ? (
        <p className="rounded-md border border-line bg-ink/50 p-4 text-sm text-acidDim">
          Contracts are not deployed on this network yet. Deploy locally with{" "}
          <code className="text-acid">npm run deploy:local</code> or switch to a
          supported testnet.
        </p>
      ) : !isConnected ? (
        <div className="space-y-3">
          <p className="text-sm text-acidDim">Connect a wallet to mint.</p>
          <ConnectButton />
        </div>
      ) : soldOut ? (
        <p className="rounded-md border border-gold/40 bg-ink/50 p-4 text-sm text-gold">
          All 999 brokers have been hired. The desk is full. 🎉
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-acidDim">
            <span>Your $STONKINU</span>
            <span className={hasEnough ? "text-acid" : "text-red-400"}>
              {fmtUnits(balance)}
            </span>
          </div>

          {!hasEnough && (
            <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              You need at least {fmtUnits(PROTOCOL.burnAmount)} $STONKINU to mint.
            </p>
          )}

          {needsApproval ? (
            <button
              onClick={approve}
              disabled={busy || !hasEnough}
              className="btn-acid w-full rounded-sm py-3 text-sm uppercase tracking-wider"
            >
              {busy ? "Approving…" : "Approve $STONKINU"}
            </button>
          ) : (
            <button
              onClick={mint}
              disabled={busy || !hasEnough}
              className="btn-acid w-full rounded-sm py-3 text-sm uppercase tracking-wider"
            >
              {busy ? "Minting…" : "Burn & Mint broker"}
            </button>
          )}

          {isSuccess && (
            <p className="rounded-md border border-acid/40 bg-ink/50 p-3 text-xs text-acid">
              ✓ Confirmed. {needsApproval ? "Approved — now mint." : "Broker hired! Check your Broker Desk."}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
              {(error as { shortMessage?: string }).shortMessage ?? "Transaction failed."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-acidDim">{label}</dt>
      <dd className="font-semibold text-acid">{children}</dd>
    </div>
  );
}
