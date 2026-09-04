"use client";

import { useReadContract } from "wagmi";
import { abis, useDeployment } from "@/lib/useBroker";
import { PROTOCOL } from "@/config/contracts";
import { Reveal } from "./Reveal";

export function Numbers() {
  const { deployment } = useDeployment();
  const { data: totalSupply } = useReadContract({
    address: deployment?.StonkInuBroker,
    abi: abis.broker,
    functionName: "totalSupply",
    query: { enabled: !!deployment, refetchInterval: 12_000 },
  });
  const minted = typeof totalSupply === "bigint" ? Number(totalSupply) : 0;
  const max = Number(PROTOCOL.maxSupply);

  const items = [
    { k: `${minted} / ${max}`, v: "Brokers hired" },
    { k: "50,000", v: "$STONKINU burned per mint" },
    { k: "1", v: "ERC-6551 wallet each" },
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
