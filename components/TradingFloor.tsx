"use client";

import { Reveal } from "./Reveal";

function pickIds(count: number, offset = 0) {
  const ids: number[] = [];
  for (let i = 0; i < count; i++) ids.push(((i * 7 + offset) % 999) + 1);
  return ids;
}

function Row({ ids, reverse = false }: { ids: number[]; reverse?: boolean }) {
  const row = [...ids, ...ids];
  return (
    <div className="flex w-max gap-4" style={{ animation: `marquee ${reverse ? "44s" : "38s"} linear infinite`, animationDirection: reverse ? "reverse" : "normal" }}>
      {row.map((id, i) => (
        <div key={i} className="relative shrink-0 overflow-hidden rounded-2xl border border-line bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/nft/images/${id}.png`} alt={`Broker #${id}`} className="pixel h-28 w-28 sm:h-36 sm:w-36" loading="lazy" />
        </div>
      ))}
    </div>
  );
}

export function TradingFloor() {
  return (
    <section className="overflow-hidden py-24">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="label">The trading floor</div>
          <h2 className="serif mt-4 max-w-2xl text-4xl leading-[1.02] sm:text-5xl">
            Every cat drawn from <span className="text-acid">its own seed.</span>
          </h2>
          <p className="mt-5 max-w-xl text-mist">
            999 unique brokers — fur, eyes, suit, tie, hat and briefcase rolled on-chain. Here are
            a few of them, working the floor.
          </p>
        </Reveal>
      </div>

      <div className="relative mt-12 space-y-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />
        <Row ids={pickIds(14, 0)} />
        <Row ids={pickIds(14, 5)} reverse />
      </div>
    </section>
  );
}
