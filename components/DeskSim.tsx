"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Reveal } from "./Reveal";

const ease = [0.22, 1, 0.36, 1] as const;

export function DeskSim() {
  const [step, setStep] = useState(0); // 0 chat, 1 confirm, 2 created
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <div className="label">Not hired bots</div>
          <h2 className="serif mt-4 text-5xl leading-[0.98] sm:text-6xl">
            Each NFT is <br />
            the <span className="text-acid">desk</span> itself.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-mist">
            Its own wallet. Its own book of tokenized stocks. Real orders, by chat.
            Sell the broker and the book goes with it.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Market, limit, stop-loss & breakout orders",
              "Positions, P&L and open orders live on the token",
              "Every order settles from the broker's own wallet",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm text-mist">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-acid" />
                {t}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="hatch rounded-3xl border border-line bg-panel/70 p-4 shadow-card backdrop-blur">
            <div className="flex items-center justify-between px-1 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-acid" />
                <span className="label !text-[10px]">Broker #0412 · The Desk</span>
              </div>
              <span className="rounded-full border border-acid/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-acid">
                Simulation
              </span>
            </div>

            {/* User command bubble */}
            <div className="rounded-2xl border border-line bg-coal/70 p-4 font-mono text-[13px] leading-relaxed text-[#dfe6df]">
              Stop-loss on <span className="text-acid">NVDA</span> at $210.00. Sell everything the
              moment the feed falls through.
            </div>

            <div className="mt-3 min-h-[190px]">
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center gap-2 px-1 pt-6 font-mono text-xs text-mist"
                  >
                    <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
                    <span className="ml-2">the desk is reading the book…</span>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease }}
                    className="rounded-2xl border border-acid/30 p-4"
                  >
                    <div className="label !text-acid !text-[10px]">Confirm the order</div>
                    <div className="serif mt-2 text-2xl">
                      Stop-loss: all NVDA if it falls to $210.00
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-mist">
                      Held by the order book until the price is met or you cancel. Expires in 7
                      days, and the escrow returns to Broker #0412 either way.
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="rounded-full border border-line px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-mist">
                        Working…
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-mist">
                        Cancel
                      </span>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="created"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5, ease }}
                  >
                    <div className="flex items-center justify-center gap-2 py-2 font-mono text-[11px] uppercase tracking-widest text-acid">
                      ✓ Order created · one signature
                    </div>
                    <div className="mt-2 rounded-2xl border border-line bg-coal/50 p-4">
                      <div className="label !text-[10px]">Resting · 2</div>
                      <div className="mt-3 space-y-2 font-mono text-[12px]">
                        <Row text="Buy $20.00 of AAPL if it falls to $300.00" />
                        <Row text="Sell all NVDA if it falls to $210.00" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Row({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[#dfe6df]">
      <span>{text}</span>
      <span className="text-mist">cancel</span>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <motion.span
      className="inline-block h-1.5 w-1.5 rounded-full bg-acid"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay: d }}
    />
  );
}
