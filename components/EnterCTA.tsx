"use client";

import Link from "next/link";
import { Reveal } from "./Reveal";

export function EnterCTA() {
  return (
    <section className="relative overflow-hidden px-5 py-28 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-acid/10 blur-[120px]" />
      <Reveal className="relative">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-coal/60 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-acid shadow-glow" />
          <span className="label !text-[10.5px]">The desk is open</span>
        </div>
        <h2 className="serif mx-auto mt-7 max-w-3xl text-5xl leading-[1.02] sm:text-7xl">
          You own the company it becomes.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-mist">
          Not a picture of an agent — the desk itself, with your account, your keys, and every
          reward settling to a wallet only your broker owns.
        </p>
        <div className="mt-10">
          <Link href="/mint" className="btn-acid inline-block rounded-full px-10 py-4 text-sm">
            Enter the firm
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
