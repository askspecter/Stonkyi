"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Reveal } from "./Reveal";

const STEPS = [
  {
    tab: "Hire",
    n: "01 · HIRE",
    icon: "🐕",
    title: "Retain a broker",
    body: "Burn 50,000 $STONKINU and pay 0.002 ETH once — a broker joins your book, its look rolled on-chain the moment you hire. Every hire burns supply forever: the loop's first squeeze.",
    pos: "top",
  },
  {
    tab: "It works",
    n: "02 · EARN",
    icon: "📈",
    title: "The desk goes to work",
    body: "Half the mint fee is instantly swapped into tokenized stock and airdropped pro-rata to every existing holder. The other half funds the protocol. You earn on every mint after yours.",
    pos: "right",
  },
  {
    tab: "Collect",
    n: "03 · COLLECT",
    icon: "💠",
    title: "Claim your stock",
    body: "Accrued stock rests on your brokers until you pull it. Claim any time from the Broker Desk — and because rewards follow the NFT, selling the broker sells the future yield with it.",
    pos: "bottom",
  },
  {
    tab: "Floor",
    n: "04 · FLOOR",
    icon: "💍",
    title: "Supply only shrinks",
    body: "999 brokers, ever. Every hire destroys 50,000 $STONKINU for good, so the roster is capped and the token is deflationary by design. Retaining gets worth it.",
    pos: "left",
  },
];

const NODE_POS: Record<string, string> = {
  top: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
  right: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2",
  bottom: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
  left: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2",
};

export function Flywheel() {
  const [active, setActive] = useState(0);

  return (
    <section id="how" className="relative px-5 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <div className="label">The flywheel</div>
          <h2 className="serif mx-auto mt-4 max-w-2xl text-4xl leading-[1.02] sm:text-5xl">
            Every mint feeds the loop that makes retaining worth it.
          </h2>
        </Reveal>

        {/* Wheel */}
        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-16 aspect-square w-full max-w-[440px]">
            <div className="animate-spinSlow absolute inset-6 rounded-full border border-dashed border-line" />
            <div className="pointer-events-none absolute inset-0 rounded-full bg-acid/5 blur-2xl" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="label">Repeats</div>
                <div className="label !text-acidDim">every mint</div>
              </div>
            </div>

            {STEPS.map((s, i) => (
              <button
                key={s.tab}
                onClick={() => setActive(i)}
                className={`absolute ${NODE_POS[s.pos]} flex flex-col items-center gap-2`}
              >
                <motion.span
                  animate={{
                    boxShadow:
                      active === i
                        ? "0 0 30px rgba(200,242,78,0.5)"
                        : "0 0 0px rgba(200,242,78,0)",
                    scale: active === i ? 1.08 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  className={`grid h-16 w-16 place-items-center rounded-2xl border text-2xl ${
                    active === i
                      ? "border-acid/60 bg-acid/10"
                      : "border-line bg-panel"
                  }`}
                >
                  {s.icon}
                </motion.span>
                <span className={`label !text-[10px] ${active === i ? "!text-acid" : ""}`}>
                  {s.tab}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        {/* Detail */}
        <Reveal delay={0.15}>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mt-8 max-w-xl text-left"
          >
            <div className="label !text-acid">{STEPS[active].n}</div>
            <p className="mt-3 text-lg leading-relaxed text-[#dfe6df]">{STEPS[active].body}</p>
          </motion.div>

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {STEPS.map((s, i) => (
              <button
                key={s.tab}
                onClick={() => setActive(i)}
                className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition ${
                  active === i
                    ? "border-acid/60 text-acid"
                    : "border-line text-mist hover:text-[#dfe6df]"
                }`}
              >
                {s.tab}
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
