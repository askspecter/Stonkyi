"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { StockTicker } from "./StockTicker";

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden pb-10 pt-28 sm:pt-36">
      <div className="grid-fade pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-acid/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-coal/60 px-4 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-acid shadow-glow" />
            <span className="label !text-[10.5px]">999 Brokers · ERC-6551 Wallets</span>
          </motion.div>

          <h1 className="serif mt-6 text-[13vw] leading-[0.95] sm:text-6xl lg:text-7xl">
            {["A broker NFT that", "starts as a desk."].map((line, i) => (
              <motion.span
                key={line}
                className="block text-[#eef3ea]"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.05 + i * 0.08, ease }}
              >
                {line}
              </motion.span>
            ))}
            {["And grows into a", "book you own."].map((line, i) => (
              <motion.span
                key={line}
                className="block italic text-mist"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + i * 0.08, ease }}
              >
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease }}
            className="mt-7 max-w-xl text-base leading-relaxed text-mist sm:text-lg"
          >
            Burn <span className="text-[#e7ece7]">50,000 $STONKINU</span> to hire a broker. Every
            broker ships with its own <span className="text-[#e7ece7]">on-chain wallet</span>, and
            every mint after yours buys tokenized stock and airdrops it to holders —
            automatically.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62, ease }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href="/mint" className="btn-acid rounded-full px-7 py-3.5 text-sm">
              Enter the firm
            </Link>
            <a href="#how" className="btn-ghost rounded-full px-7 py-3.5 text-sm">
              How it works
            </a>
          </motion.div>
        </div>

        {/* Floating example broker */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="glow-ring animate-floaty rounded-3xl border border-line bg-panel p-3 shadow-card">
            <div className="overflow-hidden rounded-2xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nft/images/12.png"
                alt="StonkInu broker example"
                className="pixel aspect-square w-full"
              />
            </div>
            <div className="flex items-center justify-between px-1 pt-3">
              <span className="label">Example</span>
              <span className="label">999 unique · on-chain</span>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-6 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-acid/10 blur-2xl" />
        </motion.div>
      </div>

      <div className="relative mt-14">
        <StockTicker />
      </div>
    </section>
  );
}
