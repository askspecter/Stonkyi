import Link from "next/link";
import { Reveal } from "./Reveal";
import { RotatingBroker } from "./RotatingBroker";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-32 sm:pt-40">
      {/* atmosphere */}
      <div
        className="glow"
        style={{ width: 560, height: 560, top: -220, left: "50%", marginLeft: -280, background: "#1f6b3a", opacity: 0.3 }}
      />
      <div className="grain" />

      <div className="relative z-[2] mx-auto max-w-5xl">
        <Reveal>
          <span className="label">999 brokers · Robinhood Chain</span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="display mt-6 max-w-3xl text-[2.35rem] leading-[1.06] sm:text-6xl lg:text-[4.4rem]">
            A broker NFT that
            <br />
            starts as a <em>trading desk.</em>
            <br />
            <span className="text-mist">And grows the book you own.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-mist sm:text-lg">
            Burn <span className="text-[#e9efe9]">$STONKINU</span> to hire a Shiba broker with its own
            on-chain wallet. Every mint buys tokenized stock and airdrops it to holders — so holding
            the broker holds the book.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/mint" className="btn-acid rounded-full px-8 py-3.5 text-sm">
              Mint a broker
            </Link>
            <a href="#how" className="btn-ghost rounded-full px-8 py-3.5 text-sm">
              How it works
            </a>
          </div>
        </Reveal>

        {/* framed example broker */}
        <Reveal delay={320}>
          <div className="mx-auto mt-16 max-w-[420px]">
            <div className="floaty relative overflow-hidden rounded-3xl border border-line bg-panel/60 p-3">
              <span className="label absolute left-5 top-5 z-10 !text-[10px]">Example</span>
              <RotatingBroker />
            </div>
            <div className="label mt-4 text-center !tracking-[0.28em]">
              999 combinations · rarity is rolled on-chain
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
