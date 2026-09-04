"use client";

import { useEffect, useMemo } from "react";
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

export function BrokerDesk() {
  const { address, isConnected } = useAccount();
  const { chainId, deployment } = useDeployment();
  const connectedChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const broker = deployment?.StonkInuBroker;

  // Pin reads to the deployment chain so holdings resolve regardless of the
  // wallet's currently-selected network.
  const brokerContract = { chainId, address: broker, abi: abis.broker } as const;

  const balanceQ = useReadContract({
    ...brokerContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!broker && !!address, refetchInterval: 12_000 },
  });
  // Every basket stock + the amount the holder can claim of each.
  const claimableQ = useReadContract({
    ...brokerContract,
    functionName: "withdrawableAll",
    args: address ? [address] : undefined,
    query: { enabled: !!broker && !!address, refetchInterval: 10_000 },
  });

  const [stockAddrs, stockAmounts] = (claimableQ.data as [readonly `0x${string}`[], readonly bigint[]]) ?? [[], []];
  // Symbols for the stocks that currently have a claimable balance.
  const earned = stockAddrs
    .map((addr, i) => ({ addr, amount: stockAmounts[i] ?? 0n }))
    .filter((s) => s.amount > 0n);

  const symbolsQ = useReadContracts({
    contracts: earned.map((s) => ({ chainId, address: s.addr, abi: abis.stock, functionName: "symbol" as const })),
    query: { enabled: earned.length > 0 },
  });

  const count = Number((balanceQ.data as bigint) ?? 0n);

  // Fetch each owned tokenId.
  const tokenIdCalls = useMemo(
    () =>
      broker && address
        ? Array.from({ length: count }, (_, i) => ({
            ...brokerContract,
            functionName: "tokenOfOwnerByIndex" as const,
            args: [address, BigInt(i)] as const,
          }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [broker, address, count, chainId]
  );
  const tokenIdsQ = useReadContracts({
    contracts: tokenIdCalls,
    query: { enabled: tokenIdCalls.length > 0 },
  });

  const tokenIds = (tokenIdsQ.data ?? [])
    .map((r) => (r.status === "success" ? (r.result as bigint) : null))
    .filter((x): x is bigint => x !== null);

  // Fetch the TBA for each owned tokenId.
  const accountCalls = useMemo(
    () =>
      broker
        ? tokenIds.map((id) => ({
            ...brokerContract,
            functionName: "accountOf" as const,
            args: [id] as const,
          }))
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [broker, chainId, tokenIds.map((t) => t.toString()).join(",")]
  );
  const accountsQ = useReadContracts({
    contracts: accountCalls,
    query: { enabled: accountCalls.length > 0 },
  });

  const { data: hash, writeContract, isPending, reset } = useWriteContract();
  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      claimableQ.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const hasClaimable = earned.length > 0;
  const busy = isPending || isMining;
  const wrongNetwork = isConnected && connectedChainId !== chainId;

  function claim() {
    if (!broker) return;
    reset();
    writeContract({ address: broker, abi: abis.broker, functionName: "claim" });
  }

  if (!deployment) {
    return (
      <p className="panel rounded-xl p-6 text-sm text-acidDim">
        Contracts are not deployed on this network yet.
      </p>
    );
  }
  if (!isConnected) {
    return (
      <div className="panel flex flex-col items-start gap-4 rounded-xl p-8">
        <div>
          <div className="text-lg font-bold acid-text">Your broker desk</div>
          <p className="mt-1 text-sm text-acidDim">
            Connect a wallet to see the brokers you hold and claim your stock rewards.
          </p>
        </div>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {wrongNetwork && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-gold/40 bg-gold/[0.06] p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-gold">
            Your wallet is on another network. Switch to Robinhood Chain to claim rewards.
          </p>
          <button
            onClick={() => switchChain({ chainId })}
            disabled={isSwitching}
            className="btn-acid shrink-0 rounded-md px-4 py-2 text-xs"
          >
            {isSwitching ? "Switching…" : "Switch network"}
          </button>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Brokers held" value={balanceQ.isLoading ? "…" : count.toString()} />
        <Stat label="Stocks earned" value={earned.length.toString()} accent="gold" />
      </div>

      {/* Overtime pay / claim */}
      <div className="panel overflow-hidden rounded-xl">
        <div className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold acid-text">Overtime pay</span>
              {hasClaimable && (
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-gold">
                  {earned.length} ready
                </span>
              )}
            </div>
            <p className="mt-1 max-w-md text-sm text-acidDim">
              Your brokers earn a random mix of tokenized stocks from every mint. Claim them all in one transaction.
            </p>
            {hasClaimable && (
              <div className="mt-4 flex flex-wrap gap-2">
                {earned.map((s, i) => {
                  const sym =
                    symbolsQ.data?.[i]?.status === "success"
                      ? (symbolsQ.data[i].result as string)
                      : short(s.addr);
                  return (
                    <span
                      key={s.addr}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.06] px-2.5 py-1 font-mono text-xs text-gold"
                    >
                      <span className="tabular-nums">{fmtUnits(s.amount)}</span>
                      <span className="text-gold/70">{sym}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={claim}
            disabled={busy || !hasClaimable || wrongNetwork}
            className="btn-acid w-full shrink-0 rounded-md px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {busy ? "Claiming…" : hasClaimable ? "Claim all" : "Nothing to claim"}
          </button>
        </div>
      </div>

      {/* Broker list */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-acid">Your brokers</h2>
          {count > 0 && (
            <span className="font-mono text-xs text-acidDim">{count} held</span>
          )}
        </div>
        {count === 0 ? (
          <div className="panel rounded-xl p-8 text-center">
            <p className="text-sm text-acidDim">
              You don&apos;t hold any brokers yet.
            </p>
            <a
              href="/mint"
              className="btn-acid mt-4 inline-block rounded-md px-5 py-2.5 text-xs"
            >
              Go to the mint desk
            </a>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tokenIds.map((id, i) => {
              const acc = accountsQ.data?.[i];
              const tba = acc?.status === "success" ? (acc.result as string) : undefined;
              return <BrokerCard key={id.toString()} id={id} tba={tba} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BrokerCard({ id, tba }: { id: bigint; tba?: string }) {
  const imgId = ((id - 1n) % 999n) + 1n; // art ids are 1..999
  return (
    <div className="panel group overflow-hidden rounded-xl transition-colors hover:border-acid/40">
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/nft/images/${imgId.toString()}.png`}
          alt={`StonkInu Broker #${id.toString()}`}
          className="aspect-square w-full bg-ink object-cover transition-transform duration-500 [image-rendering:pixelated] group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink/80 to-transparent" />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-black acid-text">#{id.toString()}</div>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-widest text-acidDim">
            Broker
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-line bg-ink/50 p-2.5">
          <div className="text-[10px] uppercase tracking-widest text-acidDim">
            ERC-6551 wallet
          </div>
          <div className="mt-1 font-mono text-sm text-gold">{tba ? short(tba) : "…"}</div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "gold";
}) {
  return (
    <div className="panel rounded-xl p-5">
      <div className="text-[11px] uppercase tracking-widest text-acidDim">{label}</div>
      <div
        className={`mt-1.5 text-3xl font-black tabular-nums ${
          accent === "gold" ? "text-gold" : "acid-text"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
