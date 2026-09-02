"use client";

import { useEffect, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { abis, useDeployment } from "@/lib/useBroker";
import { fmtUnits, short } from "@/lib/format";

export function BrokerDesk() {
  const { address, isConnected } = useAccount();
  const { deployment } = useDeployment();
  const broker = deployment?.StonkInuBroker;
  const stock = deployment?.StockToken;

  const brokerContract = { address: broker, abi: abis.broker } as const;

  const balanceQ = useReadContract({
    ...brokerContract,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!broker && !!address },
  });
  const claimableQ = useReadContract({
    ...brokerContract,
    functionName: "withdrawableStockOf",
    args: address ? [address] : undefined,
    query: { enabled: !!broker && !!address, refetchInterval: 10_000 },
  });
  const stockSymbolQ = useReadContract({
    address: stock,
    abi: abis.stock,
    functionName: "symbol",
    query: { enabled: !!stock },
  });
  const stockBalQ = useReadContract({
    address: stock,
    abi: abis.stock,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!stock && !!address },
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
    [broker, address, count]
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
    [broker, tokenIds.map((t) => t.toString()).join(",")]
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
      stockBalQ.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const claimable = (claimableQ.data as bigint) ?? 0n;
  const stockBal = (stockBalQ.data as bigint) ?? 0n;
  const symbol = (stockSymbolQ.data as string) ?? "STOCK";
  const busy = isPending || isMining;

  function claim() {
    if (!broker) return;
    reset();
    writeContract({ address: broker, abi: abis.broker, functionName: "claim" });
  }

  if (!deployment) {
    return (
      <p className="panel rounded-lg p-6 text-sm text-acidDim">
        Contracts are not deployed on this network yet.
      </p>
    );
  }
  if (!isConnected) {
    return (
      <div className="panel space-y-4 rounded-lg p-6">
        <p className="text-sm text-acidDim">Connect a wallet to see your brokers.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary + claim */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Brokers held" value={count.toString()} />
        <Stat label={`Claimable ${symbol}`} value={fmtUnits(claimable)} accent="gold" />
        <Stat label={`${symbol} balance`} value={fmtUnits(stockBal)} />
      </div>

      <div className="panel flex flex-col items-start justify-between gap-4 rounded-lg p-6 sm:flex-row sm:items-center">
        <div>
          <div className="text-lg font-bold acid-text">Overtime pay</div>
          <p className="mt-1 text-sm text-acidDim">
            Claim the tokenized stock your brokers have earned from every mint.
          </p>
        </div>
        <button
          onClick={claim}
          disabled={busy || claimable === 0n}
          className="btn-acid rounded-sm px-6 py-3 text-sm uppercase tracking-wider"
        >
          {busy ? "Claiming…" : `Claim ${fmtUnits(claimable)} ${symbol}`}
        </button>
      </div>

      {/* Broker list */}
      <div>
        <h2 className="mb-3 text-lg font-bold text-acid">Your brokers</h2>
        {count === 0 ? (
          <p className="panel rounded-lg p-6 text-sm text-acidDim">
            You don&apos;t hold any brokers yet. Head to the{" "}
            <a href="/mint" className="text-acid underline">mint desk</a>.
          </p>
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
    <div className="panel overflow-hidden rounded-lg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/nft/images/${imgId.toString()}.png`}
        alt={`StonkInu Broker #${id.toString()}`}
        className="aspect-square w-full bg-ink [image-rendering:pixelated]"
      />
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-black acid-text">#{id.toString()}</div>
          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] uppercase tracking-widest text-acidDim">
            Broker
          </span>
        </div>
        <div className="mt-3 rounded-md border border-line bg-ink/50 p-2.5">
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
    <div className="panel rounded-lg p-5">
      <div className="text-[11px] uppercase tracking-widest text-acidDim">{label}</div>
      <div
        className={`mt-1 text-2xl font-black ${accent === "gold" ? "text-gold" : "acid-text"}`}
      >
        {value}
      </div>
    </div>
  );
}
