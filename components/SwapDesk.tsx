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
import { maxUint256 } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { abis, useDeployment } from "@/lib/useBroker";
import { fmtUnits } from "@/lib/format";

const ZERO = "0x0000000000000000000000000000000000000000";
type Tab = "buy" | "sell" | "snipe";

/** Add a slippage margin (bps) to a quote for the on-chain min/max guard. */
function withSlippage(v: bigint, bps: bigint, up: boolean): bigint {
  return up ? (v * (10_000n + bps)) / 10_000n : (v * (10_000n - bps)) / 10_000n;
}

export function SwapDesk() {
  const { address, isConnected } = useAccount();
  const { chainId, deployment } = useDeployment();
  const connectedChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const amm = deployment?.BrokerAMM;
  const token = deployment?.StonkBroker;
  const nft = deployment?.StonkInuBroker;
  const live = !!amm && amm !== ZERO && !!token && token !== ZERO;

  const [tab, setTab] = useState<Tab>("buy");
  const [count, setCount] = useState(1);
  const [pickedSnipe, setPickedSnipe] = useState<bigint | null>(null);
  const [pickedSell, setPickedSell] = useState<Set<string>>(new Set());

  const ammContract = { chainId, address: amm, abi: abis.amm } as const;

  // Pool state.
  const poolQ = useReadContracts({
    contracts: [
      { ...ammContract, functionName: "nftCount" },
      { ...ammContract, functionName: "tokenReserve" },
      { ...ammContract, functionName: "ethFeePerItem" },
      { ...ammContract, functionName: "swapFeeBps" },
      { ...ammContract, functionName: "heldIds" },
    ],
    query: { enabled: live, refetchInterval: 12_000 },
  });
  const nftCount = (poolQ.data?.[0]?.result as bigint) ?? 0n;
  const reserve = (poolQ.data?.[1]?.result as bigint) ?? 0n;
  const ethFeePerItem = (poolQ.data?.[2]?.result as bigint) ?? 0n;
  const swapFeeBps = (poolQ.data?.[3]?.result as bigint) ?? 0n;
  const heldIds = (poolQ.data?.[4]?.result as readonly bigint[]) ?? [];

  // Quotes.
  const buyQ = useReadContract({
    ...ammContract,
    functionName: "quoteBuy",
    args: [BigInt(Math.max(count, 1))],
    query: { enabled: live && tab === "buy" && count > 0 && Number(nftCount) > count },
  });
  const snipeQ = useReadContract({
    ...ammContract,
    functionName: "quoteSnipe",
    args: [1n],
    query: { enabled: live && tab === "snipe" && pickedSnipe !== null },
  });
  const sellQ = useReadContract({
    ...ammContract,
    functionName: "quoteSell",
    args: [BigInt(Math.max(pickedSell.size, 1))],
    query: { enabled: live && tab === "sell" && pickedSell.size > 0 },
  });

  // User token balance + allowance.
  const balanceQ = useReadContract({
    chainId, address: token, abi: abis.stonkBroker, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address, refetchInterval: 12_000 },
  });
  const allowanceQ = useReadContract({
    chainId, address: token, abi: abis.stonkBroker, functionName: "allowance",
    args: address && amm ? [address, amm] : undefined,
    query: { enabled: live && !!address },
  });
  // NFT approval (for selling).
  const nftApprovalQ = useReadContract({
    chainId, address: nft, abi: abis.broker, functionName: "isApprovedForAll",
    args: address && amm ? [address, amm] : undefined,
    query: { enabled: live && !!address },
  });

  // The brokers this wallet owns, for the Sell tab.
  const ownedCountQ = useReadContract({
    chainId, address: nft, abi: abis.broker, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: live && !!address },
  });
  const ownedCount = Number((ownedCountQ.data as bigint) ?? 0n);
  const ownedIdCalls = useMemo(
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
  const ownedIdsQ = useReadContracts({ contracts: ownedIdCalls, query: { enabled: ownedIdCalls.length > 0 } });
  const ownedIds = (ownedIdsQ.data ?? [])
    .map((r) => (r.status === "success" ? (r.result as bigint) : null))
    .filter((x): x is bigint => x !== null);

  const { data: hash, writeContract, isPending, reset, error } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) {
      poolQ.refetch(); balanceQ.refetch(); allowanceQ.refetch();
      nftApprovalQ.refetch(); ownedCountQ.refetch();
      setPickedSell(new Set()); setPickedSnipe(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const balance = (balanceQ.data as bigint) ?? 0n;
  const allowance = (allowanceQ.data as bigint) ?? 0n;
  const nftApproved = (nftApprovalQ.data as boolean) ?? false;
  const busy = isPending || isMining;
  const wrongNetwork = isConnected && connectedChainId !== chainId;

  // Active quote + derived flags for the current tab.
  const buyCost = (buyQ.data as bigint) ?? 0n;
  const snipeCost = (snipeQ.data as bigint) ?? 0n;
  const sellOut = (sellQ.data as bigint) ?? 0n;
  const activeCost = tab === "buy" ? buyCost : tab === "snipe" ? snipeCost : 0n;
  const activeCount = tab === "sell" ? pickedSell.size : tab === "snipe" ? (pickedSnipe !== null ? 1 : 0) : count;
  const ethFee = ethFeePerItem * BigInt(Math.max(activeCount, 0));
  const needsTokenApproval = tab !== "sell" && allowance < activeCost;

  function approveToken() {
    if (!token || !amm) return;
    reset();
    writeContract({ address: token, abi: abis.stonkBroker, functionName: "approve", args: [amm, maxUint256] });
  }
  function doBuy() {
    if (!amm || !address) return;
    reset();
    writeContract({
      address: amm, abi: abis.amm, functionName: "buy",
      args: [BigInt(count), withSlippage(buyCost, 300n, true), address], value: ethFee,
    });
  }
  function doSnipe() {
    if (!amm || !address || pickedSnipe === null) return;
    reset();
    writeContract({
      address: amm, abi: abis.amm, functionName: "snipe",
      args: [[pickedSnipe], withSlippage(snipeCost, 300n, true), address], value: ethFeePerItem,
    });
  }
  function approveNft() {
    if (!nft || !amm) return;
    reset();
    writeContract({ address: nft, abi: abis.broker, functionName: "setApprovalForAll", args: [amm, true] });
  }
  function doSell() {
    if (!amm || !address || pickedSell.size === 0) return;
    reset();
    const ids = [...pickedSell].map((s) => BigInt(s));
    writeContract({
      address: amm, abi: abis.amm, functionName: "sell",
      args: [ids, withSlippage(sellOut, 300n, false), address], value: ethFeePerItem * BigInt(ids.length),
    });
  }

  if (!deployment) {
    return <p className="panel rounded-xl p-6 text-sm text-acidDim">Contracts are not deployed on this network yet.</p>;
  }
  if (!live) {
    return (
      <div className="panel rounded-xl p-8">
        <div className="text-lg font-bold acid-text">Swap Desk is warming up</div>
        <p className="mt-2 max-w-md text-sm text-acidDim">
          The $STONKBROKER token and the Anvil NFT AMM are deploying. Once live, you&apos;ll buy, sell
          and snipe broker NFTs here against $STONKBROKER with a small ETH fee.
        </p>
      </div>
    );
  }
  if (!isConnected) {
    return (
      <div className="panel flex flex-col items-start gap-4 rounded-xl p-8">
        <p className="text-sm text-acidDim">Connect a wallet to trade brokers.</p>
        <ConnectButton />
      </div>
    );
  }

  const pricePer = Number(nftCount) > 1 ? reserve / (nftCount - 1n) : 0n;

  return (
    <div className="space-y-6">
      {/* Pool header */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="In the pool" value={`${nftCount} brokers`} />
        <Stat label="Reserve" value={`${fmtUnits(reserve, 18, 0)} $SB`} />
        <Stat label="~ Floor" value={`${fmtUnits(pricePer, 18, 0)} $SB`} accent />
      </div>

      <div className="panel overflow-hidden rounded-xl">
        {/* Tabs */}
        <div className="flex border-b border-line">
          {(["buy", "sell", "snipe"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-3.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                tab === t ? "bg-acid/10 text-acid" : "text-acidDim hover:text-acid"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-6">
          {tab === "buy" && (
            <>
              <Counter count={count} setCount={setCount} max={Math.max(Number(nftCount) - 1, 0)} />
              <QuoteRow label="You pay" value={`${fmtUnits(buyCost)} $SB`} sub={`+ ${fmtUnits(ethFee)} ETH fee`} />
            </>
          )}

          {tab === "snipe" && (
            <>
              <div className="text-xs uppercase tracking-widest text-acidDim">Pick a broker to snipe</div>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {heldIds.length === 0 && <span className="text-sm text-acidDim">Pool is empty.</span>}
                {heldIds.map((id) => {
                  const sel = pickedSnipe === id;
                  return (
                    <button
                      key={id.toString()}
                      onClick={() => setPickedSnipe(sel ? null : id)}
                      className={`rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors ${
                        sel ? "border-acid bg-acid/10 text-acid" : "border-line text-acidDim hover:border-acid/50"
                      }`}
                    >
                      #{id.toString()}
                    </button>
                  );
                })}
              </div>
              <QuoteRow label="You pay" value={`${fmtUnits(snipeCost)} $SB`} sub={`+ ${fmtUnits(ethFeePerItem)} ETH fee · includes snipe premium`} />
            </>
          )}

          {tab === "sell" && (
            <>
              <div className="text-xs uppercase tracking-widest text-acidDim">Select brokers to sell</div>
              <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {ownedIds.length === 0 && <span className="text-sm text-acidDim">You hold no brokers.</span>}
                {ownedIds.map((id) => {
                  const key = id.toString();
                  const sel = pickedSell.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setPickedSell((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          return next;
                        })
                      }
                      className={`rounded-lg border px-3 py-1.5 font-mono text-sm transition-colors ${
                        sel ? "border-acid bg-acid/10 text-acid" : "border-line text-acidDim hover:border-acid/50"
                      }`}
                    >
                      #{key}
                    </button>
                  );
                })}
              </div>
              <QuoteRow label="You receive" value={`${fmtUnits(sellOut)} $SB`} sub={`− ${fmtUnits(ethFeePerItem * BigInt(pickedSell.size))} ETH fee`} />
            </>
          )}

          <div className="flex items-center justify-between text-xs text-acidDim">
            <span>Your $STONKBROKER</span>
            <span className="font-mono text-acid">{fmtUnits(balance)}</span>
          </div>
          <div className="text-[11px] text-acidDim">Swap fee {Number(swapFeeBps) / 100}% stays in the pool.</div>

          {/* Action button */}
          {wrongNetwork ? (
            <button onClick={() => switchChain({ chainId })} disabled={isSwitching} className="btn-acid w-full rounded-md py-3.5 text-sm">
              {isSwitching ? "Switching…" : "Switch to Robinhood Chain"}
            </button>
          ) : tab === "sell" ? (
            !nftApproved ? (
              <button onClick={approveNft} disabled={busy || pickedSell.size === 0} className="btn-acid w-full rounded-md py-3.5 text-sm disabled:opacity-40">
                {busy ? "Approving…" : "Approve brokers"}
              </button>
            ) : (
              <button onClick={doSell} disabled={busy || pickedSell.size === 0} className="btn-acid w-full rounded-md py-3.5 text-sm disabled:opacity-40">
                {busy ? "Selling…" : `Sell ${pickedSell.size || ""} broker${pickedSell.size === 1 ? "" : "s"}`}
              </button>
            )
          ) : needsTokenApproval ? (
            <button onClick={approveToken} disabled={busy || activeCost === 0n} className="btn-acid w-full rounded-md py-3.5 text-sm disabled:opacity-40">
              {busy ? "Approving…" : "Approve $STONKBROKER"}
            </button>
          ) : tab === "buy" ? (
            <button onClick={doBuy} disabled={busy || count < 1 || buyCost === 0n || balance < buyCost} className="btn-acid w-full rounded-md py-3.5 text-sm disabled:opacity-40">
              {busy ? "Buying…" : balance < buyCost ? "Insufficient $STONKBROKER" : `Buy ${count} broker${count === 1 ? "" : "s"}`}
            </button>
          ) : (
            <button onClick={doSnipe} disabled={busy || pickedSnipe === null || snipeCost === 0n || balance < snipeCost} className="btn-acid w-full rounded-md py-3.5 text-sm disabled:opacity-40">
              {busy ? "Sniping…" : pickedSnipe === null ? "Pick a broker" : balance < snipeCost ? "Insufficient $STONKBROKER" : `Snipe #${pickedSnipe.toString()}`}
            </button>
          )}

          {isSuccess && <p className="rounded-lg border border-acid/40 bg-acid/[0.05] p-3 text-xs text-acid">✓ Confirmed.</p>}
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">{(error as { shortMessage?: string }).shortMessage ?? "Transaction failed."}</p>}
        </div>
      </div>
    </div>
  );
}

function Counter({ count, setCount, max }: { count: number; setCount: (n: number) => void; max: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-ink/50 px-4 py-3">
      <span className="text-xs uppercase tracking-widest text-acidDim">How many</span>
      <div className="flex items-center gap-3">
        <button onClick={() => setCount(Math.max(1, count - 1))} className="grid h-8 w-8 place-items-center rounded-md border border-line text-acid">−</button>
        <span className="w-8 text-center font-mono text-lg text-acid">{count}</span>
        <button onClick={() => setCount(Math.min(Math.max(max, 1), count + 1))} className="grid h-8 w-8 place-items-center rounded-md border border-line text-acid">+</button>
      </div>
    </div>
  );
}

function QuoteRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-line bg-ink/50 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-acidDim">{label}</span>
        <span className="font-mono text-base font-bold text-acid">{value}</span>
      </div>
      {sub && <div className="mt-1 text-right text-[11px] text-acidDim">{sub}</div>}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-widest text-acidDim">{label}</div>
      <div className={`mt-1.5 text-2xl font-black ${accent ? "text-gold" : "acid-text"}`}>{value}</div>
    </div>
  );
}
