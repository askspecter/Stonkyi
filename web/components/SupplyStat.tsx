"use client";

import { useReadContract } from "wagmi";
import { abis, useDeployment } from "@/lib/useBroker";
import { PROTOCOL } from "@/config/contracts";

export function SupplyStat() {
  const { deployment } = useDeployment();

  const { data: totalSupply } = useReadContract({
    address: deployment?.StonkInuBroker,
    abi: abis.broker,
    functionName: "totalSupply",
    query: { enabled: !!deployment, refetchInterval: 10_000 },
  });

  const minted = typeof totalSupply === "bigint" ? totalSupply : 0n;
  const max = PROTOCOL.maxSupply;
  const pct = Number((minted * 100n) / max);

  return (
    <div className="rounded-md border border-line bg-ink/50 p-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-acidDim">
            Brokers hired
          </div>
          <div className="mt-1 font-black tracking-tight">
            <span className="text-3xl acid-text">{minted.toString()}</span>
            <span className="text-xl text-acidDim"> / {max.toString()}</span>
          </div>
        </div>
        <div className="text-right text-[11px] uppercase tracking-widest text-acidDim">
          {deployment ? "Live" : "Not deployed"}
          <div className="mt-1 text-lg font-bold text-gold">{pct}%</div>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-acid shadow-glow transition-all"
          style={{ width: `${Math.max(pct, deployment ? 1 : 0)}%` }}
        />
      </div>
    </div>
  );
}
