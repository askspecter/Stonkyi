"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { abis, useDeployment } from "@/lib/useBroker";
import { fmtUnits, short } from "@/lib/format";

const ZERO = "0x0000000000000000000000000000000000000000";

export function Overtime() {
  const { address, isConnected } = useAccount();
  const { chainId, deployment } = useDeployment();
  const connectedChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const overtime = deployment?.BrokerOvertime;
  const nft = deployment?.StonkInuBroker;
  const live = !!overtime && overtime !== ZERO;

  const [pickIn, setPickIn] = useState<Set<string>>(new Set());
  const [pickOut, setPickOut] = useState<Set<string>>(new Set());

  const ov = { chainId, address: overtime, abi: abis.overtime } as const;

  const totalActiveQ = useReadContract({ ...ov, functionName: "totalActive", query: { enabled: live, refetchInterval: 15_000 } });
  const stakedQ = useReadContract({
    ...ov, functionName: "stakedOf", args: address ? [address] : undefined,
    query: { enabled: live && !!address, refetchInterval: 15_000 },
  });
  const claimableQ = useReadContract({
    ...ov, functionName: "withdrawableAll", args: address ? [address] : undefined,
    query: { enabled: live && !!address, refetchInterval: 12_000 },
  });
  const approvalQ = useReadContract({
    chainId, address: nft, abi: abis.broker, functionName: "isApprovedForAll",
    args: address && overtime ? [address, overtime] : undefined,
    query: { enabled: live && !!address },
  });
  const ownedCountQ = useReadContract({
    chainId, address: nft, abi: abis.broker, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address, refetchInterval: 15_000 },
  });

  const stakedIds = (stakedQ.data as readonly bigint[]) ?? [];
  const ownedCount = Number((ownedCountQ.data as bigint) ?? 0n);
  const ownedCalls = useMemo(
    () =>
      live && address
        ? Array.from({ length: ownedCount }, (_, i) => ({
            chainId, address: nft, abi: abis.broker,
            functionName: "tokenOfOwnerByIndex" as const, args: [address, BigInt(i)] as const,
          }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live, address, ownedCount, chainId, nft]
  );
  const ownedQ = useReadContracts({ contracts: ownedCalls, query: { enabled: ownedCalls.length > 0 } });
  const ownedIds = (ownedQ.data ?? [])
    .map((r) => (r.status === "success" ? (r.result as bigint) : null))
    .filter((x): x is bigint => x !== null);

  const [tokens, amounts] = (claimableQ.data as [readonly `0x${string}`[], readonly bigint[]]) ?? [[], []];
  const earned = tokens.map((t, i) => ({ addr: t, amount: amounts[i] ?? 0n })).filter((s) => s.amount > 0n);
  const symbolsQ = useReadContracts({
    contracts: earned.map((s) => ({ chainId, address: s.addr, abi: abis.stock, functionName: "symbol" as const })),
    query: { enabled: earned.length > 0 },
  });
  const hasClaimable = earned.length > 0;

  const { data: hash, writeContract, isPending, reset, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) {
      totalActiveQ.refetch(); stakedQ.refetch(); claimableQ.refetch();
      approvalQ.refetch(); ownedCountQ.refetch();
      setPickIn(new Set()); setPickOut(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const approved = (approvalQ.data as boolean) ?? false;
  const busy = isPending || isMining;
  const wrongNetwork = isConnected && connectedChainId !== chainId;

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSet(next);
  }
  function approve() {
    if (!nft || !overtime) return;
    reset();
    writeContract({ address: nft, abi: abis.broker, functionName: "setApprovalForAll", args: [overtime, true] });
  }
  function clockIn() {
    if (!overtime || pickIn.size === 0) return;
    reset();
    writeContract({ address: overtime, abi: abis.overtime, functionName: "clockIn", args: [[...pickIn].map(BigInt)] });
  }
  function clockOut() {
    if (!overtime || pickOut.size === 0) return;
    reset();
    writeContract({ address: overtime, abi: abis.overtime, functionName: "clockOut", args: [[...pickOut].map(BigInt)] });
  }
  function claim() {
    if (!overtime) return;
    reset();
    writeContract({ address: overtime, abi: abis.overtime, functionName: "claim" });
  }
  function harvest() {
    if (!overtime) return;
    reset();
    writeContract({ address: overtime, abi: abis.overtime, functionName: "harvest" });
  }

  if (!deployment) return <p className="panel rounded-xl p-6 text-sm text-acidDim">Contracts are not deployed on this network yet.</p>;
  if (!live) {
    return (
      <div className="panel rounded-xl p-8">
        <div className="text-lg font-bold acid-text">Overtime is warming up</div>
        <p className="mt-2 max-w-md text-sm text-acidDim">
          Clock In is being wired up. Soon you&apos;ll put your brokers on the clock to earn a share of
          every tokenized-stock distribution — from mints and from Anvil trading fees.
        </p>
      </div>
    );
  }
  if (!isConnected) {
    return (
      <div className="panel flex flex-col items-start gap-4 rounded-xl p-8">
        <p className="text-sm text-acidDim">Connect a wallet to clock in your brokers.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Your brokers on the clock" value={stakedIds.length.toString()} />
        <Stat label="Brokers earning protocol-wide" value={(Number((totalActiveQ.data as bigint) ?? 0n)).toString()} accent />
      </div>

      {wrongNetwork && (
        <div className="flex items-center justify-between rounded-xl border border-gold/40 bg-gold/[0.06] p-4">
          <span className="text-sm text-gold">Wrong network.</span>
          <button onClick={() => switchChain({ chainId })} disabled={isSwitching} className="btn-acid rounded-md px-4 py-2 text-xs">
            {isSwitching ? "Switching…" : "Switch to Robinhood Chain"}
          </button>
        </div>
      )}

      {/* Overtime pay */}
      <div className="panel flex flex-col items-start justify-between gap-5 rounded-xl p-6 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="text-lg font-bold acid-text">Overtime pay</div>
          <p className="mt-1 max-w-md text-sm text-acidDim">
            Stock earned while your brokers are on the clock. Anyone can <button onClick={harvest} disabled={busy} className="text-acid underline disabled:opacity-40">harvest</button> pending mint rewards into the pool.
          </p>
          {hasClaimable && (
            <div className="mt-3 flex flex-wrap gap-2">
              {earned.map((s, i) => {
                const sym = symbolsQ.data?.[i]?.status === "success" ? (symbolsQ.data[i].result as string) : short(s.addr);
                return (
                  <span key={s.addr} className="rounded-full border border-gold/30 bg-gold/[0.06] px-2.5 py-1 font-mono text-xs text-gold">
                    {fmtUnits(s.amount)} {sym}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <button onClick={claim} disabled={busy || !hasClaimable} className="btn-acid w-full shrink-0 rounded-md px-6 py-3 text-sm disabled:opacity-40 sm:w-auto">
          {busy ? "Working…" : hasClaimable ? "Claim overtime" : "Nothing to claim"}
        </button>
      </div>

      {/* Clock in */}
      <div className="panel rounded-xl p-6">
        <div className="text-lg font-bold acid-text">Clock in</div>
        <p className="mt-1 text-sm text-acidDim">Pick brokers to put to work. They&apos;re held here while earning; clock out anytime to take them back.</p>
        <div className="mt-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {ownedIds.length === 0 && <span className="text-sm text-acidDim">No idle brokers in your wallet.</span>}
          {ownedIds.map((id) => {
            const key = id.toString();
            const sel = pickIn.has(key);
            return (
              <button key={key} onClick={() => toggle(pickIn, setPickIn, key)}
                className={`rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors ${sel ? "border-acid bg-acid/10 text-acid" : "border-line text-acidDim hover:border-acid/50"}`}>
                #{key}
              </button>
            );
          })}
        </div>
        {!wrongNetwork && (
          !approved ? (
            <button onClick={approve} disabled={busy} className="btn-acid mt-4 w-full rounded-md py-3 text-sm disabled:opacity-40">
              {busy ? "Approving…" : "Approve brokers"}
            </button>
          ) : (
            <button onClick={clockIn} disabled={busy || pickIn.size === 0} className="btn-acid mt-4 w-full rounded-md py-3 text-sm disabled:opacity-40">
              {busy ? "Clocking in…" : `Clock in ${pickIn.size || ""} broker${pickIn.size === 1 ? "" : "s"}`}
            </button>
          )
        )}
      </div>

      {/* Clock out */}
      {stakedIds.length > 0 && (
        <div className="panel rounded-xl p-6">
          <div className="text-lg font-bold acid-text">On the clock</div>
          <p className="mt-1 text-sm text-acidDim">Clock out to stop earning and return the broker to your wallet. Accrued stock stays claimable.</p>
          <div className="mt-4 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {stakedIds.map((id) => {
              const key = id.toString();
              const sel = pickOut.has(key);
              return (
                <button key={key} onClick={() => toggle(pickOut, setPickOut, key)}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors ${sel ? "border-acid bg-acid/10 text-acid" : "border-line text-acidDim hover:border-acid/50"}`}>
                  #{key}
                </button>
              );
            })}
          </div>
          {!wrongNetwork && (
            <button onClick={clockOut} disabled={busy || pickOut.size === 0} className="btn-ghost mt-4 w-full rounded-md py-3 text-sm disabled:opacity-40">
              {busy ? "Clocking out…" : `Clock out ${pickOut.size || ""} broker${pickOut.size === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      )}

      {isSuccess && <p className="rounded-lg border border-acid/40 bg-acid/[0.05] p-3 text-xs text-acid">✓ Confirmed.</p>}
      {error && <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">{(error as { shortMessage?: string }).shortMessage ?? "Transaction failed."}</p>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-widest text-acidDim">{label}</div>
      <div className={`mt-1.5 text-3xl font-black tabular-nums ${accent ? "text-gold" : "acid-text"}`}>{value}</div>
    </div>
  );
}
