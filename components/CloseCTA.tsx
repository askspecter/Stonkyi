import Link from "next/link";
import { Reveal } from "./Reveal";

export function CloseCTA() {
  return (
    <section className="relative overflow-hidden px-5 py-28 text-center">
      <div className="aura pointer-events-none absolute inset-x-0 bottom-0 top-auto h-[360px] rotate-180" />
      <Reveal className="relative">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-coal/60 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-acid" />
          <span className="label !text-[10.5px]">The desk is open</span>
        </div>
        <h2 className="display mx-auto mt-7 max-w-3xl text-5xl sm:text-6xl">
          Mint your broker. <span className="text-acid">Own the desk.</span>
        </h2>
        <div className="mt-10">
          <Link href="/mint" className="btn-acid inline-block rounded-full px-10 py-4 text-sm">
            Mint a broker
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
