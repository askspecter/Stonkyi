"use client";

import { useReadContract } from "wagmi";
import { abis, useDeployment } from "@/lib/useBroker";
import { PROTOCOL } from "@/config/contracts";
import { fmtUnits } from "@/lib/format";
import { Reveal } from "./Reveal";

/** Compact whole-number formatter: 49_950_000 -> "49.95M", 100_000 -> "100K". */
function compact(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString("en-US");
}

export function Numbers() {
  const { chainId, deployment } = useDeployment();
  const { data: totalSupply } = useReadContract({
    chainId,
    address: deployment?.StonkInuBroker,
    abi: abis.broker,
    functionName: "totalSupply",
    query: { enabled: !!deployment, refetchInterval: 12_000 },
  });

  const minted = typeof totalSupply === "bigint" ? totalSupply : 0n;
  const mintedNum = Number(minted);
  const max = Number(PROTOCOL.maxSupply);

  // Every mint burns exactly BURN_AMOUNT (50,000) $STONKINU to the dead address.
  const burnedTokens = mintedNum * Number(PROTOCOL.burnAmount / 10n ** 18n);
  // Each mint routes STOCK_SHARE (0.001 ETH) into stock for holders. The very
  // first mint has no prior holders, so its share seeds the treasury instead.
  const pairedMints = minted > 0n ? minted - 1n : 0n;
  const pairedWei = pairedMints * PROTOCOL.stockShare;

  const items = [
    { k: `${mintedNum} / ${max}`, v: "Brokers hired" },
    { k: `${compact(burnedTokens)}`, v: "$STONKINU burned, forever" },
    { k: `${fmtUnits(pairedWei)} ETH`, v: "Paired to NFT holders" },
  ];

  return (
    <section className="px-5 py-10 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
        {items.map((it, i) => (
          <Reveal key={it.v} delay={i * 80} className="bg-[#0a0d0e]">
            <div className="p-8">
              <div className="display text-4xl sm:text-5xl">{it.k}</div>
              <div className="label mt-3">{it.v}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
