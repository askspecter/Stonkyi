"use client";

import { useEffect } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useSwitchChain,
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
  const { chainId, deployment } = useDeployment();
  const connectedChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const broker = deployment?.StonkInuBroker;
  const stonkInu = deployment?.StonkInu;

  // Read the token's real metadata so the balance is always formatted with the
  // token's own decimals/symbol (never a hard-coded assumption).
  const decimalsQ = useReadContract({
    chainId,
    address: stonkInu,
    abi: abis.stonkInu,
    functionName: "decimals",
    query: { enabled: !!stonkInu },
  });
  const symbolQ = useReadContract({
    chainId,
    address: stonkInu,
    abi: abis.stonkInu,
    functionName: "symbol",
    query: { enabled: !!stonkInu },
  });

  // Pin every balance/allowance read to the deployment chain (4663) so the
  // balance shows correctly even when the wallet's active network differs.
  const balanceQ = useReadContract({
    chainId,
    address: stonkInu,
    abi: abis.stonkInu,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!stonkInu && !!address, refetchInterval: 12_000 },
  });

  const allowanceQ = useReadContract({
    chainId,
    address: stonkInu,
    abi: abis.stonkInu,
    functionName: "allowance",
    args: address && broker ? [address, broker] : undefined,
    query: { enabled: !!stonkInu && !!address && !!broker },
  });

  const supplyQ = useReadContract({
    chainId,
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

  const decimals = Number((decimalsQ.data as number | undefined) ?? 18);
  const symbol = (symbolQ.data as string | undefined) || "$STONKINU";
  const balance = (balanceQ.data as bigint) ?? 0n;
  const allowance = (allowanceQ.data as bigint) ?? 0n;
  const minted = (supplyQ.data as bigint) ?? 0n;

  const soldOut = minted >= PROTOCOL.maxSupply;
  const hasEnough = balance >= PROTOCOL.burnAmount;
  const needsApproval = allowance < PROTOCOL.burnAmount;
  const busy = isPending || isMining;
  const wrongNetwork = isConnected && connectedChainId !== chainId;

  const pct = Math.min(
    100,
    Number((minted * 10000n) / PROTOCOL.maxSupply) / 100
  );

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
    <div className="panel overflow-hidden rounded-xl">
      {/* Header + live supply meter */}
      <div className="border-b border-line/70 p-6 pb-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black tracking-tight acid-text">Hire a broker</h2>
          <span className="shrink-0 rounded-full border border-line bg-ink/60 px-3 py-1 font-mono text-[11px] tracking-widest text-acid">
            {minted.toString()} / {PROTOCOL.maxSupply.toString()}
          </span>
        </div>
        <div className="mt-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink">
            <div
              className="h-full rounded-full bg-acid transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(pct, minted > 0n ? 2 : 0)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-acidDim">
            <span>Brokers hired</span>
            <span>{(PROTOCOL.maxSupply - minted).toString()} left</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Cost breakdown */}
        <dl className="space-y-2.5 text-sm">
          <Row label="Burn cost" strong>
            {fmtUnits(PROTOCOL.burnAmount)} <span className="text-acidDim">$STONKINU</span>
          </Row>
          <Row label="Mint fee" strong>
            {fmtUnits(PROTOCOL.mintPrice)} <span className="text-acidDim">ETH</span>
          </Row>
          <div className="ml-3 space-y-2 border-l border-line/60 pl-3">
            <Row label="Buy stock for holders" muted>
              {fmtUnits(PROTOCOL.stockShare)} <span className="text-acidDim">ETH</span>
            </Row>
            <Row label="Protocol treasury" muted>
              {fmtUnits(PROTOCOL.protocolShare)} <span className="text-acidDim">ETH</span>
            </Row>
          </div>
        </dl>

        <div className="my-5 h-px w-full bg-line" />

        {!deployment ? (
          <p className="rounded-lg border border-line bg-ink/50 p-4 text-sm text-acidDim">
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
          <p className="rounded-lg border border-gold/40 bg-gold/[0.06] p-4 text-sm text-gold">
            All 999 brokers have been hired. The desk is full. 🎉
          </p>
        ) : (
          <div className="space-y-4">
            {/* Balance chip */}
            <div className="flex items-center justify-between rounded-lg border border-line bg-ink/50 px-4 py-3">
              <span className="text-xs uppercase tracking-widest text-acidDim">
                Your {symbol}
              </span>
              <span
                className={`font-mono text-base font-bold tabular-nums ${
                  hasEnough ? "text-acid" : "text-red-400"
                }`}
              >
                {balanceQ.isLoading ? "…" : fmtUnits(balance, decimals)}
              </span>
            </div>

            {!hasEnough && !balanceQ.isLoading && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs leading-relaxed text-red-300">
                You need at least{" "}
                <span className="font-semibold">{fmtUnits(PROTOCOL.burnAmount)} $STONKINU</span>{" "}
                to mint. Top up your wallet, then refresh.
              </p>
            )}

            {/* Two-step progress hint */}
            <StepBar needsApproval={needsApproval} hasEnough={hasEnough} />

            {wrongNetwork ? (
              <button
                onClick={() => switchChain({ chainId })}
                disabled={isSwitching}
                className="btn-acid w-full rounded-md py-3.5 text-sm"
              >
                {isSwitching ? "Switching…" : "Switch to Robinhood Chain"}
              </button>
            ) : needsApproval ? (
              <button
                onClick={approve}
                disabled={busy || !hasEnough}
                className="btn-acid w-full rounded-md py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Approving…" : "Approve $STONKINU"}
              </button>
            ) : (
              <button
                onClick={mint}
                disabled={busy || !hasEnough}
                className="btn-acid w-full rounded-md py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Minting…" : "Burn & Mint broker"}
              </button>
            )}

            {isSuccess && (
              <p className="rounded-lg border border-acid/40 bg-acid/[0.05] p-3 text-xs text-acid">
                ✓ Confirmed. {needsApproval ? "Approved — now mint." : "Broker hired! Check your Broker Desk."}
              </p>
            )}
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                {(error as { shortMessage?: string }).shortMessage ?? "Transaction failed."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepBar({
  needsApproval,
  hasEnough,
}: {
  needsApproval: boolean;
  hasEnough: boolean;
}) {
  const approveDone = hasEnough && !needsApproval;
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
      <Step n={1} label="Approve" active={needsApproval && hasEnough} done={approveDone} />
      <div className={`h-px flex-1 ${approveDone ? "bg-acid/50" : "bg-line"}`} />
      <Step n={2} label="Mint" active={approveDone} done={false} />
    </div>
  );
}

function Step({
  n,
  label,
  active,
  done,
}: {
  n: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold ${
          done
            ? "bg-acid text-ink"
            : active
            ? "border border-acid text-acid"
            : "border border-line text-acidDim"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span className={active || done ? "text-acid" : "text-acidDim"}>{label}</span>
    </div>
  );
}

function Row({
  label,
  children,
  strong,
  muted,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "flex items-center gap-1.5 text-acidDim" : "text-acidDim"}>
        {muted && <span className="text-acid/70">→</span>}
        {label}
      </dt>
      <dd
        className={`font-mono tabular-nums ${
          strong ? "font-semibold text-acid" : "text-acidDim"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}
