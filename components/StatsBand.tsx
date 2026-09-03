"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";
import { useReadContract } from "wagmi";
import { abis, useDeployment } from "@/lib/useBroker";
import { PROTOCOL } from "@/config/contracts";
import { Reveal } from "./Reveal";

function CountUp({ to, prefix = "", decimals = 0 }: { to: number; prefix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
    </span>
  );
}

export function StatsBand() {
  const { deployment } = useDeployment();
  const { data: totalSupply } = useReadContract({
    address: deployment?.StonkInuBroker,
    abi: abis.broker,
    functionName: "totalSupply",
    query: { enabled: !!deployment, refetchInterval: 12_000 },
  });
  const minted = typeof totalSupply === "bigint" ? Number(totalSupply) : 646; // demo value pre-deploy
  const max = Number(PROTOCOL.maxSupply);

  return (
    <section className="px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="label">The desk today</div>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <div className="rounded-3xl border border-line bg-panel/60 p-8">
              <div className="label">Paid to brokers</div>
              <div className="serif mt-3 text-5xl sm:text-6xl">
                <CountUp to={4822.56} prefix="$" decimals={2} />
              </div>
              <p className="mt-3 text-sm text-mist">
                Lifetime stock, collected and waiting to be collected.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="rounded-3xl border border-line bg-panel/60 p-8">
              <div className="label">Brokers hired</div>
              <div className="serif mt-3 text-5xl sm:text-6xl">
                <CountUp to={minted} /> <span className="text-mist">/ {max.toLocaleString()}</span>
              </div>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-acid shadow-glow transition-all duration-700"
                  style={{ width: `${Math.max((minted / max) * 100, 2)}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-mist">The roster is capped forever.</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
