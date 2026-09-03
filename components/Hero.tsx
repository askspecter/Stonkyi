import Link from "next/link";
import { Reveal } from "./Reveal";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pt-40">
      <div className="aura pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <Reveal>
          <span className="label inline-block">999 On-chain Brokers</span>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="display mx-auto mt-6 max-w-4xl text-5xl sm:text-7xl lg:text-[5.4rem]">
            Hire a broker.
            <br />
            <span className="text-acid">It earns you the market.</span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-mist sm:text-lg">
            Burn <span className="text-[#e9efe9]">$STONKINU</span> to mint a Shiba broker with its
            own <span className="text-[#e9efe9]">on-chain wallet</span>. Every mint buys tokenized
            stock and airdrops it to holders — automatically.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/mint" className="btn-acid rounded-full px-8 py-3.5 text-sm">
              Mint a broker
            </Link>
            <a href="#how" className="btn-ghost rounded-full px-8 py-3.5 text-sm">
              How it works
            </a>
          </div>
        </Reveal>

        {/* Single clean hero visual */}
        <Reveal delay={320}>
          <div className="relative mx-auto mt-16 w-full max-w-[340px]">
            <div className="floaty overflow-hidden rounded-3xl border border-line bg-panel p-2.5 shadow-[0_0_0_1px_rgba(200,242,78,0.2),0_30px_80px_-30px_rgba(0,0,0,0.8)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nft/images/23.png"
                alt="StonkInu broker"
                className="pixel aspect-square w-full rounded-2xl"
              />
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="label">Broker #023</span>
              <span className="label">ERC-6551 wallet</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
