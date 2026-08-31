"use client";

import Link from "next/link";
import { SupplyStat } from "./SupplyStat";

export function Hero() {
  return (
    <section className="grid-bg relative overflow-hidden rounded-lg border border-line panel px-6 py-14 sm:px-10">
      <div className="relative z-10 max-w-2xl">
        <span className="inline-block rounded-full border border-line bg-ink/60 px-3 py-1 text-[11px] uppercase tracking-widest text-acid">
          ▸ Clock in. Get paid in stock.
        </span>
        <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          <span className="acid-text">999 BROKERS.</span>
          <br />
          Each one a{" "}
          <span className="text-gold">wallet</span> that earns.
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-acidDim sm:text-base">
          StonkInu is a collection of 999 broker NFTs. Every broker ships with
          its own on-chain{" "}
          <span className="text-acid">ERC-6551 token-bound account</span>. Burn{" "}
          <span className="text-acid">50,000 $STONKINU</span> and pay{" "}
          <span className="text-acid">0.002 ETH</span> to hire a broker — and
          every mint after yours automatically buys tokenized stock and airdrops
          it to holders.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/mint"
            className="btn-acid rounded-sm px-6 py-3 text-sm uppercase tracking-wider"
          >
            Mint a broker
          </Link>
          <Link
            href="/dashboard"
            className="rounded-sm border border-line px-6 py-3 text-sm uppercase tracking-wider text-acid hover:bg-line"
          >
            Broker desk →
          </Link>
        </div>
      </div>

      <div className="relative z-10 mt-10">
        <SupplyStat />
      </div>
    </section>
  );
}
