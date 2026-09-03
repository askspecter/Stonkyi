import Link from "next/link";
import { Reveal } from "./Reveal";

const STATS = [
  { n: "999", l: "Supply" },
  { n: "50K", l: "Burn to mint" },
  { n: "0.002", l: "Mint price", unit: "ETH" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:pt-40">
      {/* atmosphere */}
      <div
        className="glow"
        style={{
          width: 620,
          height: 620,
          top: -240,
          right: -140,
          background: "#c8f24e",
          opacity: 0.16,
        }}
      />
      <div
        className="glow"
        style={{
          width: 520,
          height: 520,
          bottom: -280,
          left: -160,
          background: "#1f6b3a",
          opacity: 0.34,
        }}
      />
      <div className="grain" />

      <div className="relative z-[2] mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_.92fr]">
        {/* Left: copy */}
        <div>
          <Reveal>
            <span className="pill">
              <span className="dot" />
              999 brokers · live on-chain
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="display mt-6 text-5xl sm:text-6xl lg:text-[4.6rem]">
              Hire a broker.
              <br />
              It <span className="grad-acid">earns you</span>
              <br />
              the market.
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-7 max-w-md text-base leading-relaxed text-mist sm:text-lg">
              Each StonkInu is a Shiba broker with its own token-bound wallet. Every mint buys real
              tokenized stock and airdrops it to holders — automatically, forever.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/mint" className="btn-acid rounded-full px-8 py-3.5 text-sm">
                Mint a broker
              </Link>
              <a href="#how" className="btn-ghost rounded-full px-8 py-3.5 text-sm">
                How it works
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-12 flex gap-10">
              {STATS.map((s) => (
                <div key={s.l}>
                  <div className="display text-2xl sm:text-[1.7rem]">
                    {s.n}
                    {s.unit && <span className="ml-1 text-sm text-mist">{s.unit}</span>}
                  </div>
                  <div className="label mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Right: glass broker card */}
        <Reveal delay={200}>
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="glass floaty relative rounded-3xl p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nft/images/412.png"
                alt="StonkInu broker #412"
                className="pixel aspect-square w-full rounded-2xl"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="display text-lg">Broker #412</span>
                <span className="rounded-full border border-acid/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-acid">
                  ERC-6551 wallet
                </span>
              </div>

              {/* floating accrual chip */}
              <div className="glass absolute -left-5 bottom-24 flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
                <span className="h-2 w-2 rounded-full bg-[#7dff4d] shadow-[0_0_10px_#7dff4d]" />
                <span className="text-xs text-mist">
                  <span className="font-semibold text-acid">+4.20</span> stock accrued
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
